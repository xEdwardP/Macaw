const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { sendMail } = require("../../config/mailer");
const templates = require("../../utils/emailTemplates");

const sessionInclude = {
  student: { select: { id: true, name: true, email: true, avatar: true } },
  tutor: { select: { id: true, name: true, email: true, avatar: true } },
  subject: true,
  review: true,
};

const getAll = async (user) => {
  const where = {};

  if (user.role === "student") where.studentId = user.id;
  if (user.role === "tutor") where.tutorId = user.id;

  return await prisma.session.findMany({
    where,
    include: sessionInclude,
    orderBy: { date: "desc" },
  });
};

const getOne = async (id, user) => {
  const session = await prisma.session.findUnique({
    where: { id },
    include: sessionInclude,
  });

  if (!session) throw new Error("Sesión no encontrada");

  if (
    user.role !== "admin" &&
    session.studentId !== user.id &&
    session.tutorId !== user.id
  )
    throw new Error("No tienes acceso a esta sesión");

  return session;
};

const create = async (
  studentId,
  { tutorId, subjectId, date, startTime, endTime, notes },
) => {
  const tutor = await prisma.user.findUnique({
    where: { id: tutorId, role: "tutor" },
    include: { tutorProfile: true },
  });
  if (!tutor) throw new Error("Tutor no encontrado");

  const wallet = await prisma.wallet.findUnique({
    where: { userId: studentId },
  });
  if (!wallet) throw new Error("Wallet no encontrada");

  const price = tutor.tutorProfile.hourlyRate;
  if (wallet.balance < price) throw new Error("Saldo insuficiente");

  const meetingUrl = `https://meet.jit.si/macaw-${Date.now()}`;

  const session = await prisma.$transaction(async (tx) => {
    const newSession = await tx.session.create({
      data: {
        studentId,
        tutorId,
        subjectId,
        date: new Date(date),
        startTime,
        endTime,
        price,
        notes,
        meetingUrl,
        status: "pending",
      },
      include: sessionInclude,
    });

    await tx.wallet.update({
      where: { userId: studentId },
      data: { balance: { decrement: price }, frozen: { increment: price } },
    });

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: "frozen",
        amount: price,
        description: `Sesión reservada con ${tutor.name}`,
        sessionId: newSession.id,
      },
    });

    return newSession;
  });

  const student = await prisma.user.findUnique({ where: { id: studentId } });
  const dateStr = new Date(session.date).toLocaleDateString("es-HN");

  await sendMail({
    to: student.email,
    subject: "Sesión reservada exitosamente",
    html: templates.sessionBooked({
      studentName: student.name,
      tutorName: tutor.name,
      subject: subjectId,
      date: dateStr,
      startTime: session.startTime,
      meetingUrl: session.meetingUrl,
    }),
  });

  return session;
};

const confirm = async (sessionId, tutorId) => {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Sesión no encontrada");
  if (session.tutorId !== tutorId) throw new Error("No autorizado");
  if (session.status !== "pending")
    throw new Error("La sesión no está pendiente");

  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: { status: "confirmed" },
    include: sessionInclude,
  });

  const [student, tutor] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.studentId } }),
    prisma.user.findUnique({ where: { id: session.tutorId } }),
  ]);
  const date = new Date(session.date).toLocaleDateString("es-HN");

  await sendMail({
    to: student.email,
    subject: "Tu sesión fue confirmada",
    html: templates.sessionConfirmed({
      studentName: student.name,
      tutorName: tutor.name,
      date,
      startTime: session.startTime,
      meetingUrl: session.meetingUrl,
    }),
  });

  return updated;
};

const cancel = async (sessionId, user) => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { student: { include: { wallet: true } } },
  });

  if (!session) throw new Error("Sesión no encontrada");

  if (
    user.role !== "admin" &&
    session.studentId !== user.id &&
    session.tutorId !== user.id
  )
    throw new Error("No autorizado");

  if (["completed", "cancelled"].includes(session.status))
    throw new Error("La sesión no se puede cancelar");

  const hoursUntilSession =
    (new Date(session.date) - new Date()) / (1000 * 60 * 60);
  const refundAmount =
    hoursUntilSession >= 24 ? session.price : session.price * 0.5;

  await prisma.$transaction(async (tx) => {
    await tx.session.update({
      where: { id: sessionId },
      data: { status: "cancelled" },
    });

    const studentWallet = await tx.wallet.findUnique({
      where: { userId: session.studentId },
    });

    await tx.wallet.update({
      where: { userId: session.studentId },
      data: {
        balance: { increment: refundAmount },
        frozen: { decrement: session.price },
      },
    });

    await tx.transaction.create({
      data: {
        walletId: studentWallet.id,
        type: "refund",
        amount: refundAmount,
        description: "Reembolso por cancelación de sesión",
        sessionId,
      },
    });
  });

  const student = await prisma.user.findUnique({
    where: { id: session.studentId },
  });
  const date = new Date(session.date).toLocaleDateString("es-HN");

  await sendMail({
    to: student.email,
    subject: "Sesión cancelada",
    html: templates.sessionCancelled({
      userName: student.name,
      date,
      startTime: session.startTime,
      refundAmount,
    }),
  });

  return await prisma.session.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });
};

const complete = async (sessionId, tutorId) => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { tutor: { include: { wallet: true } } },
  });

  if (!session) throw new Error("Sesión no encontrada");
  if (session.tutorId !== tutorId) throw new Error("No autorizado");
  if (session.status !== "confirmed")
    throw new Error("La sesión no está confirmada");

  const commission = session.price * 0.1;
  const tutorEarnings = session.price - commission;

  await prisma.$transaction(async (tx) => {
    await tx.session.update({
      where: { id: sessionId },
      data: { status: "completed" },
    });

    const studentWallet = await tx.wallet.findUnique({
      where: { userId: session.studentId },
    });
    await tx.wallet.update({
      where: { userId: session.studentId },
      data: { frozen: { decrement: session.price } },
    });

    const tutorWallet = session.tutor.wallet;
    await tx.wallet.update({
      where: { userId: tutorId },
      data: {
        balance: { increment: tutorEarnings },
        lifetimeEarned: { increment: tutorEarnings },
      },
    });

    await tx.transaction.create({
      data: {
        walletId: studentWallet.id,
        type: "released",
        amount: session.price,
        description: "Pago liberado al tutor",
        sessionId,
      },
    });

    await tx.transaction.create({
      data: {
        walletId: tutorWallet.id,
        type: "released",
        amount: tutorEarnings,
        description: `Pago recibido (10% comisión deducida)`,
        sessionId,
      },
    });

    await tx.tutorProfile.update({
      where: { userId: tutorId },
      data: { totalSessions: { increment: 1 } },
    });
  });

  return await prisma.session.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });
};

module.exports = { getAll, getOne, create, confirm, cancel, complete };
