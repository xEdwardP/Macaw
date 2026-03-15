const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getSubjects = async ({ search }) => {
  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ];
  }
  return await prisma.subject.findMany({
    where,
    orderBy: { name: "asc" },
  });
};

const createSubject = async ({ name, code, area, universityId }) => {
  return await prisma.subject.create({
    data: { name, code, area, universityId },
  });
};

const getAnalytics = async (user) => {
  const universityId = user.role === "admin" ? undefined : user.universityId;

  const where = universityId ? { universityId } : {};

  const [
    totalStudents,
    totalTutors,
    totalSessions,
    completedSessions,
    cancelledSessions,
    totalSubsidies,
    topTutors,
    topSubjects,
    recentSessions,
  ] = await Promise.all([
    prisma.user.count({ where: { ...where, role: "student" } }),
    prisma.user.count({ where: { ...where, role: "tutor" } }),
    prisma.session.count(),
    prisma.session.count({ where: { status: "completed" } }),
    prisma.session.count({ where: { status: "cancelled" } }),
    prisma.subsidy.aggregate({ _sum: { amount: true } }),
    prisma.user.findMany({
      where: { ...where, role: "tutor" },
      select: {
        id: true,
        name: true,
        tutorProfile: {
          select: {
            averageRating: true,
            totalSessions: true,
            hourlyRate: true,
          },
        },
      },
      orderBy: { tutorProfile: { totalSessions: "desc" } },
      take: 5,
    }),
    prisma.subject.findMany({
      include: { _count: { select: { sessions: true } } },
      orderBy: { sessions: { _count: "desc" } },
      take: 5,
    }),
    prisma.session.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        student: { select: { id: true, name: true } },
        tutor: { select: { id: true, name: true } },
        subject: { select: { name: true } },
      },
    }),
  ]);

  const completionRate =
    totalSessions > 0
      ? ((completedSessions / totalSessions) * 100).toFixed(1)
      : 0;

  return {
    overview: {
      totalStudents,
      totalTutors,
      totalSessions,
      completedSessions,
      cancelledSessions,
      completionRate,
      totalSubsidiesAmount: totalSubsidies._sum.amount || 0,
    },
    topTutors,
    topSubjects,
    recentSessions,
  };
};

const getStudents = async (user, { search }) => {
  const universityId = user.role === "admin" ? undefined : user.universityId;
  const where = {
    role: "student",
    ...(universityId && { universityId }),
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  return await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      career: true,
      quarter: true,
      gpa: true,
      wallet: { select: { balance: true } },
      sessionsAsStudent: {
        select: { id: true, status: true },
      },
    },
    orderBy: { name: "asc" },
  });
};

const getSubsidies = async (user) => {
  const universityId = user.role === "admin" ? undefined : user.universityId;
  const where = universityId ? { universityId } : {};

  return await prisma.subsidy.findMany({
    where,
    orderBy: { appliedAt: "desc" },
    include: {
      student: { select: { id: true, name: true, email: true } },
      university: { select: { id: true, name: true } },
    },
  });
};

const getFaculties = async ({ universityId }) => {
  const where = universityId ? { universityId } : {};
  return await prisma.faculty.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: { select: { subjects: true } },
    },
  });
};

const getSubjectsByFaculty = async (facultyId) => {
  const faculty = await prisma.faculty.findUnique({
    where: { id: facultyId },
    include: {
      subjects: {
        include: { subject: true },
        orderBy: { subject: { quarter: "asc" } },
      },
    },
  });
  if (!faculty) throw new Error("Facultad no encontrada");
  return faculty.subjects.map((fs) => fs.subject);
};

const getPlatformEarnings = async () => {
  const platform = await prisma.user.findUnique({
    where: { email: "platform@macaw.app" },
    include: {
      wallet: {
        include: {
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      },
    },
  });

  if (!platform?.wallet) throw new Error("Platform wallet not found");

  return {
    balance: platform.wallet.balance,
    lifetimeEarned: platform.wallet.lifetimeEarned,
    transactions: platform.wallet.transactions,
  };
};

module.exports = {
  getSubjects,
  getFaculties,
  getSubjectsByFaculty,
  createSubject,
  getAnalytics,
  getStudents,
  getSubsidies,
  getPlatformEarnings,
};
