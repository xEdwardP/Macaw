const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { sendMail } = require("../../config/mailer");
const templates = require("../../utils/emailTemplates");
const { getPlatformWallet } = require("../../config/platform");
const {
  getCurrentTime,
  toAppTimezone,
  getWeekday,
  isSlotWithinBlock,
  doSlotsOverlap,
} = require("../../utils/dateTime");

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
    include: {
      tutorProfile: {
        include: { availability: true },
      },
    },
  });
  if (!tutor) throw new Error("Tutor no encontrado");

  const sessionDay = getWeekday(date);
  const dayBlocks = tutor.tutorProfile.availability.filter(
    (a) => a.dayOfWeek === sessionDay,
  );
  if (dayBlocks.length === 0)
    throw new Error("El tutor no tiene disponibilidad ese día");

  const fitsInAnyBlock = dayBlocks.some((block) =>
    isSlotWithinBlock(block.startTime, block.endTime, startTime, endTime),
  );
  if (!fitsInAnyBlock)
    throw new Error(
      "El horario solicitado está fuera de la disponibilidad del tutor",
    );

  const [y, m, d] = date.split("-").map(Number);
  const sessionDate = new Date(y, m - 1, d);
  const today = new Date(getCurrentTime().toDateString());
  if (sessionDate < today)
    throw new Error("No puedes reservar una sesión en el pasado");

  const tutorConflict = await prisma.session.findFirst({
    where: {
      tutorId,
      date: new Date(date),
      status: { in: ["pending", "confirmed"] },
    },
  });
  if (
    tutorConflict &&
    doSlotsOverlap(
      startTime,
      endTime,
      tutorConflict.startTime,
      tutorConflict.endTime,
    )
  )
    throw new Error("El tutor ya tiene una sesión en ese horario");

  const studentConflict = await prisma.session.findFirst({
    where: {
      studentId,
      date: new Date(date),
      status: { in: ["pending", "confirmed"] },
    },
  });
  if (
    studentConflict &&
    doSlotsOverlap(
      startTime,
      endTime,
      studentConflict.startTime,
      studentConflict.endTime,
    )
  )
    throw new Error("Ya tienes una sesión reservada en ese horario");

  const wallet = await prisma.wallet.findUnique({
    where: { userId: studentId },
  });
  if (!wallet) throw new Error("Wallet no encontrada");

  const price = tutor.tutorProfile.hourlyRate;
  if (wallet.balance < price) throw new Error("Saldo insuficiente");

  const meetingUrl = `https://meet.jit.si/macaw-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

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
    include: {
      student: { include: { wallet: true } },
      tutor: { include: { wallet: true } },
    },
  });

  if (!session) throw new Error("Sesión no encontrada");

  if (
    user.role !== "admin" &&
    session.studentId !== user.id &&
    session.tutorId !== user.id
  )
    throw new Error("No autorizado");

  if (["completed", "cancelled", "disputed"].includes(session.status))
    throw new Error("La sesión no se puede cancelar");

  const hoursUntilSession =
    (toAppTimezone(new Date(session.date)) - getCurrentTime()) /
    (1000 * 60 * 60);
  const isLateCancellation =
    hoursUntilSession < 24 && session.status === "confirmed";

  const refundAmount = isLateCancellation ? session.price * 0.5 : session.price;
  const tutorCompensation = isLateCancellation ? session.price * 0.5 : 0;

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
        description: isLateCancellation
          ? "Reembolso del 50% por cancelación con menos de 24hrs"
          : "Reembolso completo por cancelación",
        sessionId,
      },
    });

    if (isLateCancellation) {
      const tutorWallet = session.tutor.wallet;
      await tx.wallet.update({
        where: { userId: session.tutorId },
        data: {
          balance: { increment: tutorCompensation },
          lifetimeEarned: { increment: tutorCompensation },
        },
      });

      await tx.transaction.create({
        data: {
          walletId: tutorWallet.id,
          type: "released",
          amount: tutorCompensation,
          description:
            "Compensación del 50% por cancelación tardía del estudiante",
          sessionId,
        },
      });
    }
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

  await prisma.session.update({
    where: { id: sessionId },
    data: { status: "pending_confirmation" },
  });

  const student = await prisma.user.findUnique({
    where: { id: session.studentId },
  });
  const tutor = await prisma.user.findUnique({ where: { id: tutorId } });
  const date = new Date(session.date).toLocaleDateString("es-HN");

  await sendMail({
    to: student.email,
    subject: "Confirma tu sesión de tutoría",
    html: templates.sessionPendingConfirmation({
      studentName: student.name,
      tutorName: tutor.name,
      date,
      startTime: session.startTime,
    }),
  });

  return await prisma.session.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });
};

const studentConfirm = async (sessionId, studentId) => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { tutor: { include: { wallet: true } } },
  });

  if (!session) throw new Error("Sesión no encontrada");
  if (session.studentId !== studentId) throw new Error("No autorizado");
  if (session.status !== "pending_confirmation")
    throw new Error("La sesión no está pendiente de confirmación");

  const commission = parseFloat((session.price * 0.1).toFixed(2));
  const tutorEarnings = parseFloat((session.price - commission).toFixed(2));
  const platformWallet = await getPlatformWallet();

  await prisma.$transaction(async (tx) => {
    await tx.session.update({
      where: { id: sessionId },
      data: { status: "completed" },
    });

    const studentWallet = await tx.wallet.findUnique({
      where: { userId: studentId },
    });
    await tx.wallet.update({
      where: { userId: studentId },
      data: { frozen: { decrement: session.price } },
    });

    const tutorWallet = session.tutor.wallet;
    await tx.wallet.update({
      where: { userId: session.tutorId },
      data: {
        balance: { increment: tutorEarnings },
        lifetimeEarned: { increment: tutorEarnings },
      },
    });

    await tx.wallet.update({
      where: { id: platformWallet.id },
      data: {
        balance: { increment: commission },
        lifetimeEarned: { increment: commission },
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
        description: "Pago recibido (10% comisión deducida)",
        sessionId,
      },
    });

    await tx.transaction.create({
      data: {
        walletId: platformWallet.id,
        type: "commission",
        amount: commission,
        description: "Comisión sesión completada",
        sessionId,
      },
    });

    await tx.tutorProfile.update({
      where: { userId: session.tutorId },
      data: { totalSessions: { increment: 1 } },
    });
  });

  return await prisma.session.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });
};

const dispute = async (sessionId, studentId, reason) => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { tutor: true, student: true },
  });

  if (!session) throw new Error("Sesión no encontrada");
  if (session.studentId !== studentId) throw new Error("No autorizado");
  if (session.status !== "pending_confirmation")
    throw new Error("Solo puedes reportar sesiones pendientes de confirmación");

  await prisma.session.update({
    where: { id: sessionId },
    data: { status: "disputed", notes: reason || session.notes },
  });

  const admins = await prisma.user.findMany({ where: { role: "admin" } });
  for (const admin of admins) {
    await sendMail({
      to: admin.email,
      subject: "Nueva disputa de sesión",
      html: templates.sessionDisputed({
        adminName: admin.name,
        studentName: session.student.name,
        tutorName: session.tutor.name,
        date: new Date(session.date).toLocaleDateString("es-HN"),
        startTime: session.startTime,
        reason: reason || "Sin razón especificada",
        sessionId,
      }),
    });
  }

  return await prisma.session.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });
};

const resolve = async (sessionId, favorOf) => {
  if (!["student", "tutor"].includes(favorOf))
    throw new Error("favorOf debe ser student o tutor");

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { tutor: { include: { wallet: true } } },
  });

  if (!session) throw new Error("Sesión no encontrada");
  if (session.status !== "disputed")
    throw new Error("La sesión no está en disputa");

  if (favorOf === "student") {
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
          balance: { increment: session.price },
          frozen: { decrement: session.price },
        },
      });

      await tx.transaction.create({
        data: {
          walletId: studentWallet.id,
          type: "refund",
          amount: session.price,
          description: "Reembolso por disputa resuelta a favor del estudiante",
          sessionId,
        },
      });
    });

    const student = await prisma.user.findUnique({
      where: { id: session.studentId },
    });
    await sendMail({
      to: student.email,
      subject: "Disputa resuelta a tu favor",
      html: templates.sessionDisputeResolved({
        userName: student.name,
        favorOf: "student",
        amount: session.price,
      }),
    });
  } else {
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
        where: { userId: session.tutorId },
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
          description: "Pago liberado por disputa resuelta a favor del tutor",
          sessionId,
        },
      });

      await tx.transaction.create({
        data: {
          walletId: tutorWallet.id,
          type: "released",
          amount: tutorEarnings,
          description: "Pago recibido por disputa resuelta a tu favor",
          sessionId,
        },
      });

      await tx.tutorProfile.update({
        where: { userId: session.tutorId },
        data: { totalSessions: { increment: 1 } },
      });
    });

    const tutor = await prisma.user.findUnique({
      where: { id: session.tutorId },
    });
    await sendMail({
      to: tutor.email,
      subject: "Disputa resuelta a tu favor",
      html: templates.sessionDisputeResolved({
        userName: tutor.name,
        favorOf: "tutor",
        amount: session.price * 0.9,
      }),
    });
  }

  return await prisma.session.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });
};

const getPaginated = async (user, { page = 1, limit = 10, status }) => {
  const where = {};
  if (user.role === "student") where.studentId = user.id;
  if (user.role === "tutor") where.tutorId = user.id;
  if (status) where.status = status;

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const [sessions, total] = await Promise.all([
    prisma.session.findMany({
      where,
      include: sessionInclude,
      orderBy: { date: "desc" },
      take: parseInt(limit),
      skip: offset,
    }),
    prisma.session.count({ where }),
  ]);

  return {
    data: sessions,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / parseInt(limit)),
  };
};

module.exports = {
  getAll,
  getOne,
  create,
  confirm,
  cancel,
  complete,
  studentConfirm,
  dispute,
  resolve,
  getPaginated,
};
