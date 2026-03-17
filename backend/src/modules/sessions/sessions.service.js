const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { sendMail } = require("../../config/mailer");
const templates = require("../../utils/emailTemplates");
const { getPlatformWallet } = require('../../config/platform');
const { getIO } = require('../../config/socket');

const sessionInclude = {
  student: { select: { id: true, name: true, email: true, avatar: true, wallet: true } },
  tutor: { select: { id: true, name: true, email: true, avatar: true, wallet: true } },
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

  if (user.role !== "admin" && session.studentId !== user.id && session.tutorId !== user.id)
    throw new Error("No tienes acceso a esta sesión");

  return session;
};

const create = async (studentId, { tutorId, subjectId, date, startTime, endTime, notes }) => {
  const tutor = await prisma.user.findUnique({
    where: { id: tutorId },
    include: { tutorProfile: true },
  });
  if (!tutor) throw new Error("Tutor no encontrado");

  const wallet = await prisma.wallet.findUnique({ where: { userId: studentId } });
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

  await sendMail({
    to: wallet.userEmail,
    subject: "Sesión reservada exitosamente",
    html: templates.sessionBooked({
      studentName: wallet.userName,
      tutorName: tutor.name,
      subject: subjectId,
      date: new Date(session.date).toLocaleDateString("es-HN"),
      startTime: session.startTime,
      meetingUrl: session.meetingUrl,
    }),
  });

  getIO().to(`user:${tutorId}`).emit('new_session_request', { session });
  return session;
};

// Función para confirmar la sesión
const confirm = async (sessionId, tutorId) => {
  const session = await prisma.session.findUnique({ where: { id: sessionId }, include: sessionInclude });
  if (!session) throw new Error("Sesión no encontrada");
  if (session.tutorId !== tutorId) throw new Error("No autorizado");
  if (session.status !== "pending") throw new Error("La sesión no está pendiente");

  const updatedSession = await prisma.session.update({
    where: { id: sessionId },
    data: { status: "confirmed" },
    include: sessionInclude,
  });

  await sendMail({
    to: updatedSession.student.email,
    subject: "Tu sesión fue confirmada",
    html: templates.sessionConfirmed({
      studentName: updatedSession.student.name,
      tutorName: updatedSession.tutor.name,
      date: new Date(updatedSession.date).toLocaleDateString("es-HN"),
      startTime: updatedSession.startTime,
      meetingUrl: updatedSession.meetingUrl,
    }),
  });

  getIO().to(`user:${updatedSession.studentId}`).emit('session_confirmed', { session: updatedSession });
  return updatedSession;
};

// Función para cancelar la sesión
const cancel = async (sessionId, user) => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });
  if (!session) throw new Error("Sesión no encontrada");
  if (user.role !== "admin" && session.studentId !== user.id && session.tutorId !== user.id)
    throw new Error("No autorizado");
  if (["completed", "cancelled", "disputed"].includes(session.status))
    throw new Error("La sesión no se puede cancelar");

  const hoursUntilSession = (new Date(session.date) - new Date()) / (1000 * 60 * 60);
  const isLate = hoursUntilSession < 24 && session.status === "confirmed";
  const refundAmount = isLate ? session.price * 0.5 : session.price;
  const tutorComp = isLate ? session.price * 0.5 : 0;

  await prisma.$transaction(async (tx) => {
    await tx.session.update({ where: { id: sessionId }, data: { status: "cancelled" } });

    await tx.wallet.update({
      where: { userId: session.studentId },
      data: { balance: { increment: refundAmount }, frozen: { decrement: session.price } },
    });

    await tx.transaction.create({
      data: {
        walletId: session.student.wallet.id,
        type: "refund",
        amount: refundAmount,
        description: isLate ? "Reembolso 50% cancelación tardía" : "Reembolso completo",
        sessionId,
      },
    });

    if (isLate) {
      await tx.wallet.update({
        where: { userId: session.tutorId },
        data: { balance: { increment: tutorComp }, lifetimeEarned: { increment: tutorComp } },
      });

      await tx.transaction.create({
        data: {
          walletId: session.tutor.wallet.id,
          type: "released",
          amount: tutorComp,
          description: "Compensación 50% cancelación tardía",
          sessionId,
        },
      });
    }
  });

  await sendMail({
    to: session.student.email,
    subject: "Sesión cancelada",
    html: templates.sessionCancelled({
      userName: session.student.name,
      date: new Date(session.date).toLocaleDateString("es-HN"),
      startTime: session.startTime,
      refundAmount,
    }),
  });

  return await prisma.session.findUnique({ where: { id: sessionId }, include: sessionInclude });
};

module.exports = {
  getAll,
  getOne,
  create,
  confirm,
  cancel,
};