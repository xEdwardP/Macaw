const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const tutorSelect = {
  id: true,
  name: true,
  email: true,
  career: true,
  semester: true,
  avatar: true,
  university: { select: { id: true, name: true } },
  tutorProfile: {
    include: {
      subjects: {
        include: {
          subject: true,
        },
      },
      availability: true,
    },
  },
};

const getAll = async ({ search, subjectId, minRating, maxRate }) => {
  const where = {
    role: "tutor",
    isActive: true,
    tutorProfile: { isNot: null },
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { career: { contains: search, mode: "insensitive" } },
    ];
  }

  if (minRating) {
    where.tutorProfile = {
      ...where.tutorProfile,
      averageRating: { gte: parseFloat(minRating) },
    };
  }

  if (maxRate) {
    where.tutorProfile = {
      ...where.tutorProfile,
      hourlyRate: { lte: parseFloat(maxRate) },
    };
  }

  const tutors = await prisma.user.findMany({
    where,
    select: tutorSelect,
    orderBy: { tutorProfile: { averageRating: "desc" } },
  });

  return tutors;
};

const getOne = async (id) => {
  const tutor = await prisma.user.findUnique({
    where: { id, role: "tutor" },
    select: tutorSelect,
  });
  if (!tutor) throw new Error("Tutor no encontrado");
  return tutor;
};

const updateProfile = async (userId, { bio, hourlyRate }) => {
  const profile = await prisma.tutorProfile.update({
    where: { userId },
    data: { bio, hourlyRate: parseFloat(hourlyRate) },
  });
  return profile;
};

const addSubject = async (userId, { subjectId, level }) => {
  const profile = await prisma.tutorProfile.findUnique({ where: { userId } });
  if (!profile) throw new Error("Perfil de tutor no encontrado");

  const existing = await prisma.tutorSubject.findUnique({
    where: {
      tutorProfileId_subjectId: {
        tutorProfileId: profile.id,
        subjectId,
      },
    },
  });
  if (existing) throw new Error("Ya tienes esta materia agregada");

  return await prisma.tutorSubject.create({
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
  if (!profile) throw new Error("Perfil de tutor no encontrado");

  await prisma.tutorSubject.delete({
    where: {
      tutorProfileId_subjectId: {
        tutorProfileId: profile.id,
        subjectId,
      },
    },
  });
};

module.exports = { getAll, getOne, updateProfile, addSubject, removeSubject };
