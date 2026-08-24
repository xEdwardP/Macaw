const prisma = require("../../config/prisma");
const {
  assertTutorVisible,
} = require("../policies/tutorAccess");
const {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} = require("../../shared/errors/AppError");
const ERROR_CODES = require("../../shared/errors/codes");

const tutorSelect = {
  id: true,
  name: true,
  program: true,
  termNumber: true,
  avatar: true,
  academicUnitId: true,
  institution: {
    select: { id: true, name: true, type: true, currencyCode: true },
  },
  academicUnit: { select: { id: true, name: true, code: true, kind: true } },
  tutorProfile: {
    include: {
      subjects: {
        include: { subject: { include: { units: true } } },
      },
      availability: true,
    },
  },
};

const getAll = async (
  { search, minRating, maxRate, unitId, subjectId, page = 1, limit = 9 },
  ctx,
) => {
  const profileWhere = {};
  if (minRating) profileWhere.averageRating = { gte: parseFloat(minRating) };
  if (maxRate) profileWhere.hourlyRate = { lte: parseFloat(maxRate) };

  const subjectFilters = [
    subjectId && { subject: { id: subjectId } },
    unitId && { subject: { units: { some: { academicUnitId: unitId } } } },
  ].filter(Boolean);

  if (subjectFilters.length)
    profileWhere.AND = subjectFilters.map((some) => ({ subjects: { some } }));

  const where = {
    role: "tutor",
    isActive: true,
    tutorProfile: Object.keys(profileWhere).length
      ? { is: profileWhere }
      : { isNot: null },
    tutorMemberships: {
      some: {
        status: "verified",
        ...(ctx.isPlatformAdmin ? {} : { institutionId: ctx.institutionId }),
      },
    },
  };

  if (search)
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { program: { contains: search, mode: "insensitive" } },
      {
        tutorProfile: {
          subjects: {
            some: {
              subject: {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { code: { contains: search, mode: "insensitive" } },
                ],
              },
            },
          },
        },
      },
    ];

  const take = parseInt(limit);
  const skip = (parseInt(page) - 1) * take;

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: tutorSelect,
      orderBy: [
        { tutorProfile: { averageRating: "desc" } },
        { createdAt: "desc" },
      ],
      take,
      skip,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data,
    total,
    page: parseInt(page),
    limit: take,
    totalPages: Math.ceil(total / take),
  };
};

const getOne = async (id, ctx) => {
  await assertTutorVisible(id, ctx);

  const tutor = await prisma.user.findUnique({
    where: { id },
    select: tutorSelect,
  });

  return tutor;
};

const updateProfile = async (userId, { bio, hourlyRate }) =>
  prisma.tutorProfile.update({
    where: { userId },
    data: { bio, hourlyRate: parseFloat(hourlyRate) },
  });

const addSubject = async (userId, { subjectId, level }, ctx) => {
  const profile = await prisma.tutorProfile.findUnique({ where: { userId } });
  if (!profile)
    throw new NotFoundError(
      ERROR_CODES.TUTOR_PROFILE_NOT_FOUND,
      "Perfil de tutor no encontrado",
    );

  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject)
    throw new NotFoundError(ERROR_CODES.SUBJECT_NOT_FOUND, "Materia no encontrada");

  if (ctx.institutionId && subject.institutionId !== ctx.institutionId)
    throw new ForbiddenError(
      ERROR_CODES.INSTITUTION_MISMATCH,
      "Esta materia pertenece a otra institución",
    );

  const existing = await prisma.tutorSubject.findUnique({
    where: {
      tutorProfileId_subjectId: { tutorProfileId: profile.id, subjectId },
    },
  });
  if (existing)
    throw new ConflictError(
      ERROR_CODES.TUTOR_SUBJECT_ALREADY_ADDED,
      "Ya tienes esta materia agregada",
    );

  return prisma.tutorSubject.create({
    data: {
      tutorProfileId: profile.id,
      subjectId,
      level: level || "intermediate",
    },
    include: { subject: true },
  });
};

const removeSubject = async (userId, subjectId) => {
  const profile = await prisma.tutorProfile.findUnique({ where: { userId } });
  if (!profile)
    throw new NotFoundError(
      ERROR_CODES.TUTOR_PROFILE_NOT_FOUND,
      "Perfil de tutor no encontrado",
    );

  await prisma.tutorSubject.delete({
    where: {
      tutorProfileId_subjectId: { tutorProfileId: profile.id, subjectId },
    },
  });
};

const getAvailability = async (tutorId, ctx) => {
  await assertTutorVisible(tutorId, ctx);

  const profile = await prisma.tutorProfile.findUnique({
    where: { userId: tutorId },
    include: { availability: { orderBy: { dayOfWeek: "asc" } } },
  });
  if (!profile)
    throw new NotFoundError(ERROR_CODES.TUTOR_NOT_FOUND, "Tutor no encontrado");

  return profile.availability;
};

const setAvailability = async (userId, slots) => {
  const profile = await prisma.tutorProfile.findUnique({ where: { userId } });
  if (!profile)
    throw new NotFoundError(
      ERROR_CODES.TUTOR_PROFILE_NOT_FOUND,
      "Perfil de tutor no encontrado",
    );

  await prisma.availability.deleteMany({
    where: { tutorProfileId: profile.id },
  });

  if (!slots || slots.length === 0) return [];

  await prisma.availability.createMany({
    data: slots.map((slot) => ({
      tutorProfileId: profile.id,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
    })),
  });

  return prisma.availability.findMany({
    where: { tutorProfileId: profile.id },
    orderBy: { dayOfWeek: "asc" },
  });
};

const getBookedSlots = async (tutorId, date, ctx) => {
  if (!date) throw new BadRequestError(ERROR_CODES.VALIDATION, "Fecha requerida");
  await assertTutorVisible(tutorId, ctx);

  const [y, m, d] = date.split("-").map(Number);

  const dayStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const dayEnd = new Date(Date.UTC(y, m - 1, d + 1, 5, 59, 59));

  const sessions = await prisma.session.findMany({
    where: {
      tutorId,
      date: { gte: dayStart, lte: dayEnd },
      status: { in: ["pending", "confirmed"] },
    },
    select: { startTime: true, endTime: true },
  });

  return sessions.map((s) => ({ startTime: s.startTime, endTime: s.endTime }));
};

module.exports = {
  getAll,
  getOne,
  updateProfile,
  addSubject,
  removeSubject,
  getAvailability,
  setAvailability,
  getBookedSlots,
};
