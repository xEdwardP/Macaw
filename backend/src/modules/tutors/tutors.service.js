const prisma = require("../../config/prisma");

const tutorSelect = {
  id: true,
  name: true,
  email: true,
  career: true,
  quarter: true,
  avatar: true,
  facultyId: true,
  university: { select: { id: true, name: true } },
  faculty: { select: { id: true, name: true, code: true } },
  tutorProfile: {
    include: {
      subjects: {
        include: {
          subject: {
            include: {
              faculties: true,
            },
          },
        },
      },
      availability: true,
    },
  },
};

const getAll = async ({
  search,
  minRating,
  maxRate,
  facultyId,
  page = 1,
  limit = 9,
}) => {
  const where = {
    role: "tutor",
    isActive: true,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { career: { contains: search, mode: "insensitive" } },
    ];
  }

  const tutors = await prisma.user.findMany({
    where,
    select: tutorSelect,
    orderBy: { createdAt: "desc" },
  });

  let result = tutors.filter((t) => t.tutorProfile !== null);

  if (minRating) {
    result = result.filter(
      (t) => t.tutorProfile.averageRating >= parseFloat(minRating),
    );
  }

  if (maxRate) {
    result = result.filter(
      (t) => t.tutorProfile.hourlyRate <= parseFloat(maxRate),
    );
  }

  if (facultyId) {
    result = result.filter((t) =>
      t.tutorProfile.subjects.some((s) =>
        s.subject.faculties.some((f) => f.facultyId === facultyId),
      ),
    );
  }

  result.sort(
    (a, b) => b.tutorProfile.averageRating - a.tutorProfile.averageRating,
  );

  const total = result.length;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const data = result.slice(offset, offset + parseInt(limit));

  return {
    data,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / parseInt(limit)),
  };
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

const getAvailability = async (tutorId) => {
  const profile = await prisma.tutorProfile.findUnique({
    where: { userId: tutorId },
    include: { availability: { orderBy: { dayOfWeek: "asc" } } },
  });
  if (!profile) throw new Error("Tutor no encontrado");
  return profile.availability;
};

const setAvailability = async (userId, slots) => {
  const profile = await prisma.tutorProfile.findUnique({ where: { userId } });
  if (!profile) throw new Error("Perfil de tutor no encontrado");

  await prisma.availability.deleteMany({
    where: { tutorProfileId: profile.id },
  });

  if (!slots || slots.length === 0) return [];

  const created = await prisma.availability.createMany({
    data: slots.map((s) => ({
      tutorProfileId: profile.id,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
    })),
  });

  return await prisma.availability.findMany({
    where: { tutorProfileId: profile.id },
    orderBy: { dayOfWeek: "asc" },
  });
};

const getBookedSlots = async (tutorId, date) => {
  if (!date) throw new Error("Fecha requerida");

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
