const bcrypt = require("bcryptjs");
const prisma = require("../../config/prisma");
const outbox = require("../../shared/events/outbox");
const audit = require("../../shared/audit/audit");
const { randomToken } = require("../../utils/token");
const { acceptUrl } = require("./invitations.links");
const { assertPlanAllowsNewStudent } = require("../policies/plan.policy");
const memberships = require("../tutors/memberships.service");
const subscriptions = require("./subscriptions.service");
const { sign } = require("../../utils/jwt");
const {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} = require("../../shared/errors/AppError");
const ERROR_CODES = require("../../shared/errors/codes");

const EXPIRY_DAYS = 7;

const PASSWORD_UNTIL_INVITATION_ACCEPTED = "pending-invitation";

const INVITABLE_ROLES = [
  "institution_admin",
  "institution_staff",
  "tutor",
  "student",
  "guardian",
];

const expiryFrom = (now = new Date()) =>
  new Date(now.getTime() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);

const publicView = ({ token: _token, ...invitation }) => invitation;

const ownerView = (invitation) => ({
  ...publicView(invitation),
  acceptUrl: acceptUrl(invitation.token),
});

const issue = async (
  client,
  { institutionId, email, role, invitedById, name },
) => {
  const invitation = await client.invitation.create({
    data: {
      institutionId,
      email,
      role,
      invitedById: invitedById || null,
      token: randomToken(24),
      expiresAt: expiryFrom(),
    },
    include: { institution: { select: { id: true, name: true, locale: true } } },
  });

  await outbox.publish(client, "invitation_created", {
    invitationId: invitation.id,
    email,
    name: name || null,
    role,
    token: invitation.token,
    institutionName: invitation.institution.name,
    locale: invitation.institution.locale,
    expiresAt: invitation.expiresAt,
  });

  return invitation;
};

const assertEmailAvailable = async (client, email, institutionId) => {
  const user = await client.user.findUnique({
    where: { email },
    select: { id: true, institutionId: true, password: true },
  });

  if (!user) return null;

  if (user.institutionId !== institutionId)
    throw new ConflictError(
      ERROR_CODES.AUTH_EMAIL_TAKEN,
      "Este correo ya pertenece a otra institución",
    );

  if (user.password !== PASSWORD_UNTIL_INVITATION_ACCEPTED)
    throw new ConflictError(
      ERROR_CODES.AUTH_EMAIL_TAKEN,
      "Este correo ya tiene una cuenta activa. Usa la recuperación de contraseña.",
    );

  return user;
};

const create = async (ctx, { email, role, name, institutionId }) => {
  const targetInstitutionId = ctx.isPlatformAdmin
    ? institutionId || ctx.institutionId
    : ctx.institutionId;

  if (!targetInstitutionId)
    throw new BadRequestError(
      ERROR_CODES.INSTITUTION_REQUIRED,
      "Indica la institución a la que pertenece la invitación",
    );

  if (!INVITABLE_ROLES.includes(role))
    throw new BadRequestError(
      ERROR_CODES.INVITATION_ROLE_NOT_ALLOWED,
      "No se puede invitar a alguien con ese rol",
    );

  if (role === "tutor") {
    const active = await prisma.user.findFirst({
      where: {
        email,
        role: "tutor",
        isActive: true,
        password: { not: PASSWORD_UNTIL_INVITATION_ACCEPTED },
      },
      select: { id: true },
    });

    if (active)
      throw new ConflictError(
        ERROR_CODES.TUTOR_ALREADY_HAS_ACCOUNT,
        "Este tutor ya tiene cuenta en Macaw. Invítalo desde la verificación de tutores para que se sume a tu institución.",
      );
  }

  await assertEmailAvailable(prisma, email, targetInstitutionId);

  const pending = await prisma.invitation.findFirst({
    where: { institutionId: targetInstitutionId, email, status: "pending" },
  });

  if (pending)
    throw new ConflictError(
      ERROR_CODES.INVITATION_ALREADY_SENT,
      "Ya existe una invitación pendiente para este correo",
    );

  const invitation = await prisma.$transaction(async (tx) => {
    const created = await issue(tx, {
      institutionId: targetInstitutionId,
      email,
      role,
      name,
      invitedById: audit.actorOf(ctx),
    });

    await audit.record(tx, {
      institutionId: targetInstitutionId,
      actorId: audit.actorOf(ctx),
      action: "invitation.created",
      entity: "Invitation",
      entityId: created.id,
      metadata: { email, role },
    });

    return created;
  });

  return ownerView(invitation);
};

const createMember = async (ctx, { name, email, password, role, institutionId }) => {
  const targetInstitutionId = ctx.isPlatformAdmin
    ? institutionId || ctx.institutionId
    : ctx.institutionId;

  if (!targetInstitutionId)
    throw new BadRequestError(
      ERROR_CODES.INSTITUTION_REQUIRED,
      "Indica la institución a la que pertenece la cuenta",
    );

  const institution = await prisma.institution.findUnique({
    where: { id: targetInstitutionId },
    select: { id: true, status: true, currencyCode: true },
  });

  if (!institution)
    throw new NotFoundError(
      ERROR_CODES.INSTITUTION_NOT_FOUND,
      "Institución no encontrada",
    );

  if (institution.status !== "active")
    throw new ForbiddenError(
      ERROR_CODES.INSTITUTION_SUSPENDED,
      "Esta institución no admite cuentas nuevas en este momento",
    );

  const taken = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (taken)
    throw new ConflictError(
      ERROR_CODES.AUTH_EMAIL_TAKEN,
      "Este correo ya está registrado",
    );

  if (role === "student") await assertPlanAllowsNewStudent(targetInstitutionId);

  const hashed = await bcrypt.hash(password, 12);

  return prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name,
        email,
        password: hashed,
        role,
        institutionId: targetInstitutionId,
        emailVerifiedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        institution: { select: { id: true, name: true } },
      },
    });

    await tx.wallet.create({
      data: { userId: created.id, currency: institution.currencyCode },
    });

    if (role === "tutor") {
      await tx.tutorProfile.create({ data: { userId: created.id } });
      await memberships.grant(tx, {
        tutorId: created.id,
        institutionId: targetInstitutionId,
        reviewedById: audit.actorOf(ctx),
      });
    }

    if (role === "student")
      await subscriptions.registerStudent(tx, targetInstitutionId);

    await audit.record(tx, {
      institutionId: targetInstitutionId,
      actorId: audit.actorOf(ctx),
      action: "institution.member_created",
      entity: "User",
      entityId: created.id,
      metadata: { email, role },
    });

    return created;
  });
};

const list = async (ctx, { status, page = 1, limit = 20 }) => {
  const where = {
    ...(ctx.isPlatformAdmin ? {} : { institutionId: ctx.institutionId }),
    ...(status ? { status } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.invitation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
      include: { institution: { select: { id: true, name: true } } },
    }),
    prisma.invitation.count({ where }),
  ]);

  return {
    data: data.map(publicView),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const findOwned = async (ctx, id) => {
  const invitation = await prisma.invitation.findFirst({
    where: {
      id,
      ...(ctx.isPlatformAdmin ? {} : { institutionId: ctx.institutionId }),
    },
  });

  if (!invitation)
    throw new NotFoundError(
      ERROR_CODES.INVITATION_NOT_FOUND,
      "Invitación no encontrada",
    );

  return invitation;
};

const revoke = async (ctx, id) => {
  const invitation = await findOwned(ctx, id);

  if (invitation.status !== "pending")
    throw new ConflictError(
      ERROR_CODES.INVITATION_NOT_PENDING,
      "Solo se pueden revocar invitaciones pendientes",
    );

  return prisma.$transaction(async (tx) => {
    const updated = await tx.invitation.update({
      where: { id },
      data: { status: "revoked" },
    });

    await audit.record(tx, {
      institutionId: invitation.institutionId,
      actorId: audit.actorOf(ctx),
      action: "invitation.revoked",
      entity: "Invitation",
      entityId: id,
      metadata: { email: invitation.email },
    });

    return publicView(updated);
  });
};

const resend = async (ctx, id) => {
  const invitation = await findOwned(ctx, id);

  if (invitation.status !== "pending")
    throw new ConflictError(
      ERROR_CODES.INVITATION_NOT_PENDING,
      "Solo se pueden reenviar invitaciones pendientes",
    );

  return prisma.$transaction(async (tx) => {
    const updated = await tx.invitation.update({
      where: { id },
      data: { token: randomToken(24), expiresAt: expiryFrom() },
      include: { institution: { select: { id: true, name: true, locale: true } } },
    });

    await outbox.publish(tx, "invitation_created", {
      invitationId: updated.id,
      email: updated.email,
      name: null,
      role: updated.role,
      token: updated.token,
      institutionName: updated.institution.name,
      locale: updated.institution.locale,
      expiresAt: updated.expiresAt,
    });

    return ownerView(updated);
  });
};

const describe = async (token) => {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      institution: {
        select: { id: true, name: true, type: true, currencyCode: true },
      },
    },
  });

  if (!invitation)
    throw new NotFoundError(
      ERROR_CODES.INVITATION_NOT_FOUND,
      "Invitación no encontrada",
    );

  if (invitation.status !== "pending")
    throw new ConflictError(
      ERROR_CODES.INVITATION_NOT_PENDING,
      "Esta invitación ya no está disponible",
    );

  if (invitation.expiresAt < new Date())
    throw new ConflictError(
      ERROR_CODES.INVITATION_EXPIRED,
      "Esta invitación expiró",
    );

  return {
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    institution: invitation.institution,
  };
};

const accept = async ({ token, name, password }) => {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { institution: true },
  });

  if (!invitation)
    throw new NotFoundError(
      ERROR_CODES.INVITATION_NOT_FOUND,
      "Invitación no encontrada",
    );

  if (invitation.status !== "pending")
    throw new ConflictError(
      ERROR_CODES.INVITATION_NOT_PENDING,
      "Esta invitación ya fue utilizada o revocada",
    );

  if (invitation.expiresAt < new Date()) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "expired" },
    });
    throw new ConflictError(
      ERROR_CODES.INVITATION_EXPIRED,
      "Esta invitación expiró. Pide una nueva a tu institución.",
    );
  }

  if (invitation.institution.status !== "active")
    throw new ForbiddenError(
      ERROR_CODES.INSTITUTION_SUSPENDED,
      "Esta institución no admite ingresos en este momento",
    );

  const existing = await assertEmailAvailable(
    prisma,
    invitation.email,
    invitation.institutionId,
  );

  if (invitation.role === "student" && !existing)
    await assertPlanAllowsNewStudent(invitation.institutionId);

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const saved = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            password: hashed,
            isActive: true,
            emailVerifiedAt: new Date(),
            ...(name ? { name } : {}),
          },
        })
      : await tx.user.create({
          data: {
            name,
            email: invitation.email,
            password: hashed,
            role: invitation.role,
            institutionId: invitation.institutionId,
            emailVerifiedAt: new Date(),
          },
        });

    if (invitation.role === "tutor")
      await memberships.grant(tx, {
        tutorId: saved.id,
        institutionId: invitation.institutionId,
        reviewedById: invitation.invitedById,
      });

    if (!existing) {
      await tx.wallet.create({
        data: {
          userId: saved.id,
          currency: invitation.institution.currencyCode,
        },
      });

      if (invitation.role === "tutor")
        await tx.tutorProfile.create({ data: { userId: saved.id } });

      if (invitation.role === "student")
        await tx.subscription.updateMany({
          where: { institutionId: invitation.institutionId },
          data: { currentStudents: { increment: 1 } },
        });
    }

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { status: "accepted", acceptedAt: new Date() },
    });

    await audit.record(tx, {
      institutionId: invitation.institutionId,
      actorId: saved.id,
      action: "invitation.accepted",
      entity: "Invitation",
      entityId: invitation.id,
      metadata: { email: invitation.email, role: invitation.role },
    });

    return saved;
  });

  const { password: _password, ...safeUser } = user;

  return {
    user: safeUser,
    token: sign({
      id: user.id,
      role: user.role,
      institutionId: user.institutionId,
    }),
  };
};

module.exports = {
  issue,
  create,
  createMember,
  list,
  revoke,
  resend,
  describe,
  accept,
  INVITABLE_ROLES,
  EXPIRY_DAYS,
  PASSWORD_UNTIL_INVITATION_ACCEPTED,
};
