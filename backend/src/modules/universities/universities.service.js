const prisma = require("../../config/prisma");
const paypal = require("../../config/paypal");

const getSubjects = async ({ search, facultyId, page = 1, limit = 10 }) => {
  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ];
  }

  if (facultyId) {
    where.faculties = { some: { facultyId } };
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const [data, total] = await Promise.all([
    prisma.subject.findMany({
      where,
      orderBy: { name: "asc" },
      include: { faculties: true },
      take: parseInt(limit),
      skip: offset,
    }),
    prisma.subject.count({ where }),
  ]);

  return {
    data,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / parseInt(limit)),
  };
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

const getStudents = async (user, { search, page = 1, limit = 10 }) => {
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

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const [data, total] = await Promise.all([
    prisma.user.findMany({
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
        sessionsAsStudent: { select: { id: true, status: true } },
      },
      orderBy: { name: "asc" },
      take: parseInt(limit),
      skip: offset,
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

const getFaculties = async ({ universityId, page = 1, limit = 8 }) => {
  const where = universityId ? { universityId } : {};
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const [data, total] = await Promise.all([
    prisma.faculty.findMany({
      where,
      orderBy: { name: "asc" },
      include: { _count: { select: { subjects: true } } },
      take: parseInt(limit),
      skip: offset,
    }),
    prisma.faculty.count({ where }),
  ]);

  return {
    data,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / parseInt(limit)),
  };
};

const getSubjectsByFaculty = async (
  facultyId,
  { page = 1, limit = 8 } = {},
) => {
  const faculty = await prisma.faculty.findUnique({ where: { id: facultyId } });
  if (!faculty) throw new Error("Facultad no encontrada");

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const [data, total] = await Promise.all([
    prisma.facultySubject.findMany({
      where: { facultyId },
      include: { subject: true },
      orderBy: { subject: { quarter: "asc" } },
      take: parseInt(limit),
      skip: offset,
    }),
    prisma.facultySubject.count({ where: { facultyId } }),
  ]);

  return {
    data: data.map((fs) => fs.subject),
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / parseInt(limit)),
  };
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

const createFaculty = async ({ name, code }, user) => {
  if (!name || !code) throw new Error("Nombre y código son requeridos");
  return await prisma.faculty.create({
    data: { name, code, universityId: user.universityId },
    include: { _count: { select: { subjects: true } } },
  });
};

const updateFaculty = async (id, { name, code }, user) => {
  const faculty = await prisma.faculty.findUnique({ where: { id } });
  if (!faculty) throw new Error("Facultad no encontrada");
  if (faculty.universityId !== user.universityId)
    throw new Error("No autorizado");
  return await prisma.faculty.update({
    where: { id },
    data: { name, code },
    include: { _count: { select: { subjects: true } } },
  });
};

const deleteFaculty = async (id, user) => {
  const faculty = await prisma.faculty.findUnique({ where: { id } });
  if (!faculty) throw new Error("Facultad no encontrada");
  if (faculty.universityId !== user.universityId)
    throw new Error("No autorizado");
  return await prisma.faculty.delete({ where: { id } });
};

const createSubject = async (
  { name, code, quarter, credits, isGeneral, facultyId },
  user,
) => {
  const existing = await prisma.subject.findUnique({ where: { code } });
  if (existing)
    throw new Error(`Ya existe una materia con el código "${code}"`);

  const subject = await prisma.subject.create({
    data: { name, code, quarter, credits, isGeneral },
  });

  if (facultyId) {
    await prisma.facultySubject.create({
      data: { facultyId, subjectId: subject.id },
    });
  }

  return subject;
};

const updateSubject = async (
  id,
  { name, code, quarter, credits, isGeneral, facultyId },
  user,
) => {
  if (code) {
    const existing = await prisma.subject.findUnique({ where: { code } });
    if (existing && existing.id !== id)
      throw new Error(`Ya existe una materia con el código "${code}"`);
  }

  const subject = await prisma.subject.update({
    where: { id },
    data: {
      name,
      quarter,
      credits,
      isGeneral,
      ...(code && { code }),
    },
    include: { faculties: true },
  });

  if (!isGeneral && facultyId) {
    await prisma.facultySubject.deleteMany({ where: { subjectId: id } });
    await prisma.facultySubject.create({ data: { facultyId, subjectId: id } });
  }

  if (isGeneral) {
    await prisma.facultySubject.deleteMany({ where: { subjectId: id } });
  }

  return subject;
};

const deleteSubject = async (id, user) => {
  const tutorCount = await prisma.tutorSubject.count({
    where: { subjectId: id },
  });
  if (tutorCount > 0)
    throw new Error(
      "No se puede eliminar, hay tutores que imparten esta materia",
    );

  const sessionCount = await prisma.session.count({ where: { subjectId: id } });
  if (sessionCount > 0)
    throw new Error(
      "No se puede eliminar, hay sesiones asociadas a esta materia",
    );

  await prisma.facultySubject.deleteMany({ where: { subjectId: id } });
  return await prisma.subject.delete({ where: { id } });
};

const assignSubjectToFaculty = async (facultyId, subjectId, user) => {
  const faculty = await prisma.faculty.findUnique({ where: { id: facultyId } });
  if (!faculty) throw new Error("Facultad no encontrada");
  if (faculty.universityId !== user.universityId)
    throw new Error("No autorizado");
  return await prisma.facultySubject.create({ data: { facultyId, subjectId } });
};

const removeSubjectFromFaculty = async (facultyId, subjectId, user) => {
  const faculty = await prisma.faculty.findUnique({ where: { id: facultyId } });
  if (!faculty) throw new Error("Facultad no encontrada");
  if (faculty.universityId !== user.universityId)
    throw new Error("No autorizado");
  return await prisma.facultySubject.deleteMany({
    where: { facultyId, subjectId },
  });
};

module.exports = {
  getSubjects,
  getFaculties,
  getSubjectsByFaculty,
  createSubject,
  updateSubject,
  deleteSubject,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  assignSubjectToFaculty,
  removeSubjectFromFaculty,
  getAnalytics,
  getStudents,
  getSubsidies,
  getPlatformEarnings,
  rechargeUniversity,
  getList,
  createUniversityOrder,
  captureUniversityOrder,
};
