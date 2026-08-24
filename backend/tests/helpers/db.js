const prisma = require("../../src/config/prisma");

const TABLES_IN_DELETION_ORDER = [
  "exchangeRate",
  "outboxEvent",
  "paymentOrder",
  "ledgerEntry",
  "ledgerTransaction",
  "ledgerAccount",
  "review",
  "transaction",
  "session",
  "availability",
  "tutorSubject",
  "tutorProfile",
  "withdrawalRequest",
  "subsidy",
  "wallet",
  "auditLog",
  "invitation",
  "notification",
  "userToken",
  "gradeLevel",
  "user",
  "unitSubject",
  "subject",
  "academicUnit",
  "subscription",
  "institutionDomain",
  "institution",
];

const SEEDED_PLAN_PREFIX = "plan_";

const resetDatabase = async () => {
  for (const table of TABLES_IN_DELETION_ORDER) {
    await prisma[table].deleteMany();
  }

  await prisma.plan.deleteMany({
    where: { NOT: { id: { startsWith: SEEDED_PLAN_PREFIX } } },
  });
};

const ledgerTotals = async () => {
  const [credits, debits] = await Promise.all([
    prisma.ledgerEntry.aggregate({
      where: { direction: "credit" },
      _sum: { amount: true },
    }),
    prisma.ledgerEntry.aggregate({
      where: { direction: "debit" },
      _sum: { amount: true },
    }),
  ]);

  return {
    credits: Number(credits._sum.amount || 0),
    debits: Number(debits._sum.amount || 0),
  };
};

const walletTotals = async () => {
  const result = await prisma.wallet.aggregate({
    _sum: { balance: true, frozen: true, lifetimeEarned: true },
  });
  return {
    balance: Number(result._sum.balance || 0),
    frozen: Number(result._sum.frozen || 0),
    lifetimeEarned: Number(result._sum.lifetimeEarned || 0),
  };
};

module.exports = { prisma, resetDatabase, walletTotals, ledgerTotals };
