const bcrypt = require("bcryptjs");
const prisma = require("../../config/prisma");
const { uploadImage } = require("../../config/uploads");
const audit = require("../../shared/audit/audit");
const {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} = require("../../shared/errors/AppError");
const ERROR_CODES = require("../../shared/errors/codes");

const getAll = async ({
  search,
  role,
  institutionId,
  page = 1,
  limit = 10,
} = {}) => {
  const where = {};

  if (role) where.role = role;
  if (institutionId) where.institutionId = institutionId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { program: { contains: search, mode: "insensitive" } },
    ];
  }

  where.NOT = { email: "platform@macaw.app" };

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
      skip: offset,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        program: true,
        termNumber: true,
        isActive: true,
        createdAt: true,
        institutionId: true,
        academicUnitId: true,
        institution: { select: { id: true, name: true, type: true } },
        academicUnit: { select: { id: true, name: true, code: true } },
        wallet: { select: { balance: true, frozen: true } },
        tutorProfile: {
          select: {
            averageRating: true,
            totalSessions: true,
            isVerified: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / parseInt(limit)),
  };
};

const createCoordinator = async (
  actorId,
  { name, email, password, institutionId },
) => {
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
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

  const hashed = await bcrypt.hash(password, 12);

  return prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: "institution_admin",
        institutionId,
        emailVerifiedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        institution: { select: { id: true, name: true, type: true } },
      },
    });

    await tx.wallet.create({
      data: { userId: created.id, currency: institution.currencyCode },
    });

    await audit.record(tx, {
      institutionId,
      actorId,
      action: "user.coordinator_created",
      entity: "User",
      entityId: created.id,
      metadata: { email },
    });

    return created;
  });
};

const toggleActive = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError(ERROR_CODES.USER_NOT_FOUND, "Usuario no encontrado");
  if (user.email === "admin@macaw.app")
    throw new ForbiddenError(ERROR_CODES.USER_CANNOT_DISABLE_ADMIN, "No puedes desactivar al admin");

  return await prisma.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
    select: { id: true, name: true, email: true, isActive: true },
  });
};

const updatePreferences = async (userId, { locale, themePreference }) => {
  const data = {};
  if (locale !== undefined) data.locale = locale;
  if (themePreference !== undefined) data.themePreference = themePreference;

  return await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, locale: true, themePreference: true },
  });
};

const assertUnitBelongsToInstitution = async (userId, academicUnitId) => {
  if (!academicUnitId) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { institutionId: true },
  });

  const unit = await prisma.academicUnit.findFirst({
    where: { id: academicUnitId, institutionId: user.institutionId },
    select: { id: true },
  });

  if (!unit)
    throw new BadRequestError(
      ERROR_CODES.ACADEMIC_UNIT_NOT_FOUND,
      "Esa unidad académica no es de tu institución",
    );
};

const updateProfile = async (userId, changes) => {
  await assertUnitBelongsToInstitution(userId, changes.academicUnitId);

  const data = {};
  for (const key of [
    "name",
    "program",
    "termNumber",
    "academicUnitId",
    "paypalEmail",
    "avatar",
  ])
    if (changes[key] !== undefined) data[key] = changes[key];

  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      name: true,
      program: true,
      termNumber: true,
      academicUnitId: true,
      paypalEmail: true,
      avatar: true,
    },
  });
};

const setAvatar = async (userId, file) => {
  const url = await uploadImage(file, {
    folder: "avatars",
    publicId: userId,
    width: 256,
  });

  return updateProfile(userId, { avatar: url });
};

module.exports = {
  getAll,
  createCoordinator,
  toggleActive,
  updatePreferences,
  updateProfile,
  setAvatar,
};
