const bcrypt = require("bcryptjs");
const prisma = require("../../config/prisma");
const env = require("../../config/env");
const { sign } = require("../../utils/jwt");
const subscriptions = require("../institutions/subscriptions.service");
const { assertPlanAllowsNewStudent } = require("../policies/plan.policy");
const memberships = require("../tutors/memberships.service");
const account = require("./account.service");
const {
  resolveSettings,
  labelsFor,
} = require("../../config/institutionSettings");
const {
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
} = require("../../shared/errors/AppError");
const ERROR_CODES = require("../../shared/errors/codes");

const userSelect = {
  id: true,
  name: true,
  email: true,
  emailVerifiedAt: true,
  role: true,
  paypalEmail: true,
  avatar: true,
  program: true,
  termNumber: true,
  locale: true,
  themePreference: true,
  institutionId: true,
  academicUnitId: true,
  gradeLevelId: true,
  institution: {
    select: {
      id: true,
      name: true,
      type: true,
      currencyCode: true,
      locale: true,
      timezone: true,
      primaryColor: true,
      logo: true,
      settings: true,
    },
  },
  academicUnit: { select: { id: true, name: true, code: true, kind: true } },
  gradeLevel: { select: { id: true, name: true, code: true } },
  tutorProfile: {
    select: { isVerified: true, verifiedAt: true, hourlyRate: true },
  },
};

const present = (user) => {
  if (!user?.institution) return user;

  return {
    ...user,
    institution: {
      ...user.institution,
      settings: resolveSettings(user.institution),
      labels: labelsFor(user.institution.type),
    },
  };
};

const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });

  if (!user)
    throw new UnauthorizedError(
      ERROR_CODES.AUTH_TOKEN_INVALID,
      "Token inválido o expirado",
    );

  return present(user);
};

const resolveInstitutionByDomain = async (email) => {
  const domain = email.split("@")[1];
  if (!domain) return null;

  const match = await prisma.institutionDomain.findUnique({
    where: { domain },
    select: { institutionId: true, verifiedAt: true },
  });

  return match?.verifiedAt ? match.institutionId : null;
};


const register = async ({ name, email, password, role, academicUnitId }) => {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing && existing.isActive)
    throw new ConflictError(
      ERROR_CODES.AUTH_EMAIL_TAKEN,
      "Este correo ya está registrado",
    );

  if (existing && !existing.isActive)
    throw new ForbiddenError(
      ERROR_CODES.AUTH_ACCOUNT_DISABLED,
      "Esta cuenta está desactivada. Contacta a tu institución.",
    );

  const resolvedInstitutionId = await resolveInstitutionByDomain(email);

  let walletCurrency = env.PLATFORM_BASE_CURRENCY;

  if (resolvedInstitutionId) {
    const institution = await prisma.institution.findUnique({
      where: { id: resolvedInstitutionId },
      select: { id: true, status: true, currencyCode: true },
    });

    if (!institution)
      throw new ConflictError(
        ERROR_CODES.INSTITUTION_NOT_FOUND,
        "Institución no encontrada",
      );

    if (institution.status !== "active")
      throw new ForbiddenError(
        ERROR_CODES.INSTITUTION_SUSPENDED,
        "Esta institución no admite registros en este momento",
      );

    if (role === "student") await assertPlanAllowsNewStudent(institution.id);

    walletCurrency = institution.currencyCode;
  }

  if (academicUnitId) {
    const unit = await prisma.academicUnit.findFirst({
      where: { id: academicUnitId, institutionId: resolvedInstitutionId },
    });
    if (!unit)
      throw new ConflictError(
        ERROR_CODES.ACADEMIC_UNIT_NOT_FOUND,
        "Unidad académica no válida para esta institución",
      );
  }

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name,
        email,
        password: hashed,
        role,
        academicUnitId: academicUnitId || null,
        institutionId: resolvedInstitutionId || null,
        emailVerifiedAt: env.EMAIL_VERIFICATION_ENABLED ? null : new Date(),
      },
      select: userSelect,
    });

    await tx.wallet.create({
      data: { userId: created.id, currency: walletCurrency },
    });

    if (role === "tutor") {
      await tx.tutorProfile.create({ data: { userId: created.id } });

      if (resolvedInstitutionId)
        await memberships.ensureRequested(tx, {
          tutorId: created.id,
          institutionId: resolvedInstitutionId,
        });
    }

    if (role === "student" && resolvedInstitutionId)
      await subscriptions.registerStudent(tx, resolvedInstitutionId);

    if (env.EMAIL_VERIFICATION_ENABLED)
      await account.sendVerification(tx, created);

    return created;
  });

  const token = sign({
    id: user.id,
    role: user.role,
    institutionId: user.institutionId,
  });

  return { user: present(user), token };
};

const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { ...userSelect, password: true, isActive: true },
  });

  if (!user)
    throw new UnauthorizedError(
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      "Credenciales incorrectas",
    );

  if (!user.isActive)
    throw new ForbiddenError(
      ERROR_CODES.AUTH_ACCOUNT_DISABLED,
      "Tu cuenta está desactivada. Contacta a tu institución.",
    );

  const valid = await bcrypt.compare(password, user.password);
  if (!valid)
    throw new UnauthorizedError(
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      "Credenciales incorrectas",
    );

  const { password: _password, isActive: _isActive, ...safeUser } = user;

  const token = sign({
    id: user.id,
    role: user.role,
    institutionId: user.institutionId,
  });

  return { user: present(safeUser), token };
};

module.exports = { register, login, getProfile };
