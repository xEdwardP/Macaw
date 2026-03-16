const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getMyWallet = async (userId) => {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
  });
  if (!wallet) throw new Error("Wallet no encontrada");
  return wallet;
};

const getTransactions = async (userId, { limit = 20, offset = 0, type }) => {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new Error("Wallet no encontrada");

  const where = { walletId: wallet.id };
  if (type) where.type = type;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: { session: { select: { id: true, date: true, status: true } } },
    }),
    prisma.transaction.count({ where }),
  ]);

  return { transactions, total, limit, offset };
};

const recharge = async ({ userId, amount }) => {
  if (!userId || !amount || amount <= 0) throw new Error("Datos inválidos");

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new Error("Wallet no encontrada");

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.wallet.update({
      where: { userId },
      data: { balance: { increment: parseFloat(amount) } },
    });

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: "recharge",
        amount: parseFloat(amount),
        description: `Recarga manual de $${amount}`,
      },
    });

    return updated;
  });
};

const addSubsidy = async ({ studentId, amount, reason, universityId }) => {
  if (!studentId || !amount || amount <= 0) throw new Error("Datos inválidos");

  if (!universityId) throw new Error("Universidad requerida");

  const university = await prisma.university.findUnique({
    where: { id: universityId },
  });
  if (!university) throw new Error("Universidad no encontrada");

  if (university.balance < parseFloat(amount))
    throw new Error(
      `Saldo insuficiente. La universidad tiene $${university.balance.toFixed(2)} disponibles`,
    );

  const wallet = await prisma.wallet.findUnique({
    where: { userId: studentId },
  });
  if (!wallet) throw new Error("Wallet del estudiante no encontrada");

  return await prisma.$transaction(async (tx) => {
    await tx.university.update({
      where: { id: universityId },
      data: { balance: { decrement: parseFloat(amount) } },
    });

    const updated = await tx.wallet.update({
      where: { userId: studentId },
      data: { balance: { increment: parseFloat(amount) } },
    });

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: "subsidy",
        amount: parseFloat(amount),
        description: reason || "Subsidio universitario",
      },
    });

    await tx.subsidy.create({
      data: {
        universityId,
        studentId,
        amount: parseFloat(amount),
        reason,
      },
    });

    return updated;
  });
};

module.exports = { getMyWallet, getTransactions, recharge, addSubsidy };
