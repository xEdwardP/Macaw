const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const paypal = require("../../config/paypal");

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
    include: {
      faculties: true,
    },
  });
};

const createSubject = async ({
  name,
  code,
  quarter,
  credits,
  isGeneral,
}) => {
  if (!name || !code)
    throw new Error("Datos incompletos");

  const exists = await prisma.subject.findUnique({
    where: { code },
  });

  if (exists) throw new Error("El código ya existe");

  return await prisma.subject.create({
    data: {
      name,
      code,
      quarter: quarter ?? null,
      credits: credits ?? null,
      isGeneral: !!isGeneral,
    },
  });
};

const getAnalytics = async (user) => {
  const universityId = user.role === "admin" ? undefined : user.universityId;
  const where = universityId ? { universityId } : {};

  const university = universityId
    ? await prisma.university.findUnique({ where: { id: universityId } })
    : null;

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
      universityBalance: university?.balance || 0,
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
      facultyId: true,
      faculty: { select: { id: true, name: true, code: true } },
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

const rechargeUniversity = async ({ universityId, amount }) => {
  if (!universityId || !amount || amount <= 0)
    throw new Error("Datos inválidos");

  return await prisma.university.update({
    where: { id: universityId },
    data: { balance: { increment: parseFloat(amount) } },
  });
};

const getList = async () => {
  return await prisma.university.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          users: { where: { role: "student" } },
        },
      },
    },
  });
};

const createUniversityOrder = async (universityId, amount) => {
  if (!universityId) throw new Error("Universidad requerida");
  if (!amount || amount <= 0) throw new Error("Monto inválido");

  const VALID_AMOUNTS = [100, 250, 500, 1000, 2000];
  if (!VALID_AMOUNTS.includes(parseFloat(amount)))
    throw new Error("Monto no válido");

  const order = await paypal.createOrder(parseFloat(amount));
  return {
    orderId: order.id,
    status: order.status,
    amount,
  };
};

const captureUniversityOrder = async (universityId, orderId) => {
  if (!universityId) throw new Error("Universidad requerida");
  if (!orderId) throw new Error("Order ID requerido");

  const capture = await paypal.captureOrder(orderId);

  if (capture.status !== "COMPLETED")
    throw new Error("El pago no fue completado");

  const capturedAmount = parseFloat(
    capture.purchase_units[0].payments.captures[0].amount.value,
  );

  if (!capturedAmount || capturedAmount <= 0)
    throw new Error("Monto capturado inválido");

  const existing = await prisma.university.findFirst({
    where: { id: universityId },
  });
  if (!existing) throw new Error("Universidad no encontrada");

  const updated = await prisma.university.update({
    where: { id: universityId },
    data: { balance: { increment: capturedAmount } },
  });

  return {
    balance: updated.balance,
    amount: capturedAmount,
    orderId,
  };
};



// Facultades
const createFaculty = async ({ universityId, name, code }) => {
  if (!universityId || !name || !code) throw new Error("Datos incompletos");
  if (name.length < 3) throw new Error("El nombre debe tener al menos 3 caracteres");
  if (code.length < 2) throw new Error("El código debe tener al menos 2 caracteres");

  // Validar que el código sea único por universidad
  const existing = await prisma.faculty.findFirst({
    where: { universityId, code },
  });
  if (existing) throw new Error("El código ya existe para esta universidad");

  return await prisma.faculty.create({
    data: { universityId, name, code },
  });
};

const updateFaculty = async (id, { name, code }) => {
  const faculty = await prisma.faculty.findUnique({ where: { id } });
  if (!faculty) throw new Error("Facultad no encontrada");

  if (name && name.length < 3) throw new Error("El nombre debe tener al menos 3 caracteres");
  if (code && code.length < 2) throw new Error("El código debe tener al menos 2 caracteres");

  if (code && code !== faculty.code) {
    const exists = await prisma.faculty.findFirst({
      where: { universityId: faculty.universityId, code },
    });
    if (exists) throw new Error("El código ya existe para esta universidad");
  }

  return await prisma.faculty.update({
    where: { id },
    data: { name, code },
  });
};

const deleteFaculty = async (id) => {
  const faculty = await prisma.faculty.findUnique({ where: { id } });
  if (!faculty) throw new Error("Facultad no encontrada");

  return await prisma.faculty.delete({ where: { id } });
};

// Asignar/quitar materia
const assignSubjectToFaculty = async (facultyId, subjectId) => {
  if (!facultyId || !subjectId) throw new Error("Datos incompletos");

  const existing = await prisma.facultySubject.findFirst({
    where: { facultyId, subjectId },
  });
  if (existing) throw new Error("La materia ya está asignada a esta facultad");

  return await prisma.facultySubject.create({
    data: { facultyId, subjectId },
  });
};

const removeSubjectFromFaculty = async (facultyId, subjectId) => {
  const existing = await prisma.facultySubject.findFirst({
    where: { facultyId, subjectId },
  });
  if (!existing) throw new Error("La materia no está asignada a esta facultad");

  return await prisma.facultySubject.delete({ where: { id: existing.id } });
};

const updateSubject = async (id, data) => {
  const subject = await prisma.subject.findUnique({
    where: { id },
  });

  if (!subject) throw new Error("Materia no encontrada");

  return await prisma.subject.update({
    where: { id },
    data,
  });
};

const deleteSubject = async (id) => {
  const subject = await prisma.subject.findUnique({
    where: { id },
  });

  if (!subject) throw new Error("Materia no encontrada");

  const assigned = await prisma.facultySubject.findFirst({
    where: { subjectId: id },
  });

  if (assigned)
    throw new Error(
      "No puedes eliminar una materia asignada a una facultad"
    );

  return await prisma.subject.delete({
    where: { id },
  });
};

module.exports = {
  updateSubject,
deleteSubject,
  getSubjects,
  getFaculties,
  getSubjectsByFaculty,
  createSubject,
  getAnalytics,
  getStudents,
  getSubsidies,
  getPlatformEarnings,
  rechargeUniversity,
  getList,
  createUniversityOrder,
  captureUniversityOrder,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  assignSubjectToFaculty,
  removeSubjectFromFaculty
};
