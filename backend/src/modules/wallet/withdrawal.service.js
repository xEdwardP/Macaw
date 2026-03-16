const { PrismaClient } = require("@prisma/client");
const { sendMail } = require("../../config/mailer");
const templates = require("../../utils/emailTemplates");
const prisma = new PrismaClient();

const getAll = async (user) => {
  const where = user.role === "admin" ? {} : { userId: user.id };
  return await prisma.withdrawalRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, name: true, email: true, paypalEmail: true },
      },
    },
  });
};

const create = async (userId, { amount, paypalEmail }) => {
  if (!amount || amount <= 0) throw new Error("Monto inválido");
  if (!paypalEmail) throw new Error("Email de PayPal requerido");

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new Error("Wallet no encontrada");
  if (wallet.balance < amount) throw new Error("Saldo insuficiente");

  const existing = await prisma.withdrawalRequest.findFirst({
    where: { userId, status: "pending" },
  });
  if (existing) throw new Error("Ya tienes una solicitud de retiro pendiente");

  const request = await prisma.$transaction(async (tx) => {
    const newRequest = await tx.withdrawalRequest.create({
      data: {
        userId,
        amount: parseFloat(amount),
        paypalEmail,
        status: "pending",
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await tx.wallet.update({
      where: { userId },
      data: {
        balance: { decrement: parseFloat(amount) },
        frozen: { increment: parseFloat(amount) },
      },
    });

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: "frozen",
        amount: parseFloat(amount),
        description: `Retiro solicitado a PayPal: ${paypalEmail}`,
      },
    });

    return newRequest;
  });

  const admins = await prisma.user.findMany({
    where: { role: "admin", email: { not: "platform@macaw.app" } },
  });
  for (const admin of admins) {
    await sendMail({
      to: admin.email,
      subject: "Nueva solicitud de retiro",
      html: templates.withdrawalRequested({
        adminName: admin.name,
        tutorName: request.user.name,
        amount: parseFloat(amount),
        paypalEmail,
      }),
    });
  }

  return request;
};

const approve = async (requestId) => {
  const request = await prisma.withdrawalRequest.findUnique({
    where: { id: requestId },
    include: { user: { include: { wallet: true } } },
  });

  if (!request) throw new Error("Solicitud no encontrada");
  if (request.status !== "pending")
    throw new Error("La solicitud ya fue procesada");

  await prisma.$transaction(async (tx) => {
    await tx.withdrawalRequest.update({
      where: { id: requestId },
      data: { status: "approved" },
    });

    await tx.wallet.update({
      where: { userId: request.userId },
      data: { frozen: { decrement: request.amount } },
    });

    await tx.transaction.create({
      data: {
        walletId: request.user.wallet.id,
        type: "withdrawal",
        amount: request.amount,
        description: `Retiro aprobado a PayPal: ${request.paypalEmail}`,
      },
    });
  });

  await sendMail({
    to: request.user.email,
    subject: "Retiro aprobado",
    html: templates.withdrawalApproved({
      tutorName: request.user.name,
      amount: request.amount,
      paypalEmail: request.paypalEmail,
    }),
  });

  return await prisma.withdrawalRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
};

const reject = async (requestId, notes) => {
  const request = await prisma.withdrawalRequest.findUnique({
    where: { id: requestId },
    include: { user: { include: { wallet: true } } },
  });

  if (!request) throw new Error("Solicitud no encontrada");
  if (request.status !== "pending")
    throw new Error("La solicitud ya fue procesada");

  await prisma.$transaction(async (tx) => {
    await tx.withdrawalRequest.update({
      where: { id: requestId },
      data: { status: "rejected", notes },
    });

    await tx.wallet.update({
      where: { userId: request.userId },
      data: {
        balance: { increment: request.amount },
        frozen: { decrement: request.amount },
      },
    });

    await tx.transaction.create({
      data: {
        walletId: request.user.wallet.id,
        type: "refund",
        amount: request.amount,
        description: `Retiro rechazado - monto devuelto al wallet`,
      },
    });
  });

  await sendMail({
    to: request.user.email,
    subject: "Solicitud de retiro rechazada",
    html: templates.withdrawalRejected({
      tutorName: request.user.name,
      amount: request.amount,
      notes: notes || "Sin motivo especificado",
    }),
  });

  return await prisma.withdrawalRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
};

module.exports = { getAll, create, approve, reject };
