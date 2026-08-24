const prisma = require("../../config/prisma");
const audit = require("../../shared/audit/audit");
const outbox = require("../../shared/events/outbox");
const notifications = require("../notifications/notifications.service");
const {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} = require("../../shared/errors/AppError");
const ERROR_CODES = require("../../shared/errors/codes");

const institutionSelect = {
  id: true,
  name: true,
  type: true,
  logo: true,
  currencyCode: true,
};

const membershipSelect = {
  id: true,
  status: true,
  origin: true,
  note: true,
  requestedAt: true,
  reviewedAt: true,
  institution: { select: institutionSelect },
};

const ensureRequested = (client, { tutorId, institutionId }) =>
  client.tutorMembership.upsert({
    where: { tutorId_institutionId: { tutorId, institutionId } },
    update: {},
    create: { tutorId, institutionId, status: "pending", origin: "tutor" },
  });

const grant = (client, { tutorId, institutionId, reviewedById, note }) =>
  client.tutorMembership.upsert({
    where: { tutorId_institutionId: { tutorId, institutionId } },
    update: {
      status: "verified",
      reviewedAt: new Date(),
      reviewedById: reviewedById || null,
      ...(note ? { note } : {}),
    },
    create: {
      tutorId,
      institutionId,
      status: "verified",
      origin: "institution",
      note: note || null,
      reviewedAt: new Date(),
      reviewedById: reviewedById || null,
    },
  });

const assertVerifiedIn = async (tutorId, institutionId) => {
  const membership = await prisma.tutorMembership.findUnique({
    where: { tutorId_institutionId: { tutorId, institutionId } },
    select: { status: true },
  });

  if (membership?.status === "verified") return;

  throw new ForbiddenError(
    ERROR_CODES.TUTOR_NOT_VERIFIED_IN_INSTITUTION,
    "Este tutor todavía no está verificado por esta institución",
  );
};

const verifiedInstitutionIds = async (tutorId) => {
  const rows = await prisma.tutorMembership.findMany({
    where: { tutorId, status: "verified" },
    select: { institutionId: true },
  });

  return rows.map((row) => row.institutionId);
};

const listMine = async (tutorId) => {
  const data = await prisma.tutorMembership.findMany({
    where: { tutorId },
    select: membershipSelect,
    orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
  });

  return { data };
};

const joinable = async (tutorId) => {
  const taken = await prisma.tutorMembership.findMany({
    where: { tutorId },
    select: { institutionId: true },
  });

  const data = await prisma.institution.findMany({
    where: {
      status: "active",
      id: { notIn: taken.map((row) => row.institutionId) },
    },
    select: institutionSelect,
    orderBy: { name: "asc" },
  });

  return { data };
};

const assertIsTutor = async (tutorId) => {
  const tutor = await prisma.user.findFirst({
    where: { id: tutorId, role: "tutor", isActive: true },
    select: { id: true, name: true, email: true, locale: true },
  });

  if (!tutor)
    throw new NotFoundError(
      ERROR_CODES.TUTOR_PROFILE_NOT_FOUND,
      "Perfil de tutor no encontrado",
    );

  return tutor;
};

const assertInstitutionOpen = async (institutionId) => {
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    select: { id: true, name: true, status: true, locale: true },
  });

  if (!institution)
    throw new NotFoundError(
      ERROR_CODES.INSTITUTION_NOT_FOUND,
      "Institución no encontrada",
    );

  if (institution.status !== "active")
    throw new ForbiddenError(
      ERROR_CODES.INSTITUTION_SUSPENDED,
      "Esta institución no admite solicitudes en este momento",
    );

  return institution;
};

const request = async (tutorId, institutionId) => {
  await assertIsTutor(tutorId);
  const institution = await assertInstitutionOpen(institutionId);

  const existing = await prisma.tutorMembership.findUnique({
    where: { tutorId_institutionId: { tutorId, institutionId } },
  });

  if (existing?.status === "verified")
    throw new ConflictError(
      ERROR_CODES.TUTOR_MEMBERSHIP_EXISTS,
      "Ya estás verificado en esta institución",
    );

  if (existing?.status === "pending")
    throw new ConflictError(
      ERROR_CODES.TUTOR_MEMBERSHIP_EXISTS,
      "Ya tienes una solicitud pendiente en esta institución",
    );

  const membership = await prisma.$transaction(async (tx) => {
    const saved = existing
      ? await tx.tutorMembership.update({
          where: { id: existing.id },
          data: {
            status: "pending",
            origin: "tutor",
            note: null,
            requestedAt: new Date(),
            reviewedAt: null,
            reviewedById: null,
          },
          select: membershipSelect,
        })
      : await tx.tutorMembership.create({
          data: { tutorId, institutionId, status: "pending", origin: "tutor" },
          select: membershipSelect,
        });

    await audit.record(tx, {
      institutionId,
      actorId: tutorId,
      action: "tutor.membership_requested",
      entity: "TutorMembership",
      entityId: saved.id,
      metadata: { tutorId, institution: institution.name },
    });

    return saved;
  });

  return membership;
};

const respond = async (tutorId, membershipId, accept) => {
  const membership = await prisma.tutorMembership.findFirst({
    where: { id: membershipId, tutorId },
    include: { institution: { select: { id: true, name: true } } },
  });

  if (!membership)
    throw new NotFoundError(
      ERROR_CODES.TUTOR_MEMBERSHIP_NOT_FOUND,
      "Solicitud no encontrada",
    );

  if (membership.origin !== "institution" || membership.status !== "pending")
    throw new ConflictError(
      ERROR_CODES.TUTOR_MEMBERSHIP_NOT_PENDING,
      "Esta invitación ya no está disponible",
    );

  return prisma.$transaction(async (tx) => {
    const saved = await tx.tutorMembership.update({
      where: { id: membershipId },
      data: {
        status: accept ? "verified" : "rejected",
        reviewedAt: new Date(),
      },
      select: membershipSelect,
    });

    await audit.record(tx, {
      institutionId: membership.institutionId,
      actorId: tutorId,
      action: accept
        ? "tutor.membership_accepted"
        : "tutor.membership_declined",
      entity: "TutorMembership",
      entityId: membershipId,
      metadata: { tutorId },
    });

    return saved;
  });
};

const scopeOf = (ctx) => {
  if (ctx.isPlatformAdmin) return {};

  if (!ctx.institutionId)
    throw new ForbiddenError(
      ERROR_CODES.INSTITUTION_REQUIRED,
      "No perteneces a ninguna institución",
    );

  return { institutionId: ctx.institutionId };
};

const listForInstitution = async (
  ctx,
  { status, search, page = 1, limit = 10 },
) => {
  const where = {
    ...scopeOf(ctx),
    ...(status ? { status } : {}),
    ...(search
      ? {
          tutor: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const take = parseInt(limit);
  const skip = (parseInt(page) - 1) * take;

  const [data, total] = await Promise.all([
    prisma.tutorMembership.findMany({
      where,
      orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
      take,
      skip,
      select: {
        ...membershipSelect,
        tutor: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            program: true,
            institutionId: true,
            institution: { select: { id: true, name: true } },
            tutorProfile: {
              select: {
                bio: true,
                hourlyRate: true,
                averageRating: true,
                totalSessions: true,
                subjects: {
                  select: { subject: { select: { id: true, name: true } } },
                },
              },
            },
          },
        },
      },
    }),
    prisma.tutorMembership.count({ where }),
  ]);

  return {
    data,
    total,
    page: parseInt(page),
    limit: take,
    totalPages: Math.ceil(total / take),
  };
};

const notifyTutor = async (tx, { membership, tutor, institution, type, email }) => {
  if (email)
    await outbox.publish(tx, type, {
      userId: tutor.id,
      email: tutor.email,
      name: tutor.name,
      institutionName: institution.name,
      locale: tutor.locale || institution.locale || "es",
    });

  return notifications.create(tx, {
    userId: tutor.id,
    type,
    payload: { institutionName: institution.name, membershipId: membership.id },
  });
};

const review = async (ctx, membershipId, { status, note }) => {
  const membership = await prisma.tutorMembership.findFirst({
    where: { id: membershipId, ...scopeOf(ctx) },
    include: {
      institution: { select: { id: true, name: true, locale: true } },
      tutor: {
        select: { id: true, name: true, email: true, locale: true },
      },
    },
  });

  if (!membership)
    throw new NotFoundError(
      ERROR_CODES.TUTOR_MEMBERSHIP_NOT_FOUND,
      "Solicitud no encontrada",
    );

  const becameVerified =
    status === "verified" && membership.status !== "verified";

  const notification = await prisma.$transaction(async (tx) => {
    await tx.tutorMembership.update({
      where: { id: membershipId },
      data: {
        status,
        note: note || null,
        reviewedAt: new Date(),
        reviewedById: audit.actorOf(ctx),
      },
    });

    await audit.record(tx, {
      institutionId: membership.institutionId,
      actorId: audit.actorOf(ctx),
      action: `tutor.membership_${status}`,
      entity: "TutorMembership",
      entityId: membershipId,
      metadata: { tutorId: membership.tutorId, note: note || null },
    });

    if (!becameVerified) return null;

    return notifyTutor(tx, {
      membership,
      tutor: membership.tutor,
      institution: membership.institution,
      type: "tutor_verified",
      email: true,
    });
  });

  notifications.emit(notification);

  return prisma.tutorMembership.findUnique({
    where: { id: membershipId },
    select: membershipSelect,
  });
};

const invite = async (ctx, { email, note }) => {
  const scope = scopeOf(ctx);
  const institutionId = scope.institutionId || ctx.institutionId;

  if (!institutionId)
    throw new ForbiddenError(
      ERROR_CODES.INSTITUTION_REQUIRED,
      "Indica la institución que invita",
    );

  const institution = await assertInstitutionOpen(institutionId);

  const tutor = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      locale: true,
      role: true,
      isActive: true,
    },
  });

  if (!tutor || tutor.role !== "tutor" || !tutor.isActive)
    throw new NotFoundError(
      ERROR_CODES.TUTOR_NOT_FOUND,
      "No hay ninguna cuenta de tutor activa con ese correo",
    );

  const existing = await prisma.tutorMembership.findUnique({
    where: {
      tutorId_institutionId: { tutorId: tutor.id, institutionId },
    },
  });

  if (existing?.status === "verified")
    throw new ConflictError(
      ERROR_CODES.TUTOR_MEMBERSHIP_EXISTS,
      "Este tutor ya está verificado en tu institución",
    );

  if (existing?.status === "pending")
    throw new ConflictError(
      ERROR_CODES.TUTOR_MEMBERSHIP_EXISTS,
      "Este tutor ya tiene una solicitud pendiente en tu institución",
    );

  const { membership, notification } = await prisma.$transaction(async (tx) => {
    const saved = existing
      ? await tx.tutorMembership.update({
          where: { id: existing.id },
          data: {
            status: "pending",
            origin: "institution",
            note: note || null,
            requestedAt: new Date(),
            reviewedAt: null,
            reviewedById: audit.actorOf(ctx),
          },
          select: membershipSelect,
        })
      : await tx.tutorMembership.create({
          data: {
            tutorId: tutor.id,
            institutionId,
            status: "pending",
            origin: "institution",
            note: note || null,
            reviewedById: audit.actorOf(ctx),
          },
          select: membershipSelect,
        });

    await audit.record(tx, {
      institutionId,
      actorId: audit.actorOf(ctx),
      action: "tutor.membership_invited",
      entity: "TutorMembership",
      entityId: saved.id,
      metadata: { tutorId: tutor.id, email },
    });

    return {
      membership: saved,
      notification: await notifyTutor(tx, {
        membership: saved,
        tutor,
        institution,
        type: "tutor_membership_invited",
      }),
    };
  });

  notifications.emit(notification);

  return membership;
};

module.exports = {
  ensureRequested,
  grant,
  assertVerifiedIn,
  verifiedInstitutionIds,
  listMine,
  joinable,
  request,
  respond,
  listForInstitution,
  review,
  invite,
};
