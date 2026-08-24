const prisma = require("../../config/prisma");
const sessionMoney = require("../sessions/sessions.money");
const { money, greaterThan, toNumber } = require("../../shared/money/money");
const { resolveSettings } = require("../../config/institutionSettings");
const {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} = require("../../shared/errors/AppError");
const ERROR_CODES = require("../../shared/errors/codes");

const getMyWallet = async (userId) => {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet)
    throw new NotFoundError(ERROR_CODES.WALLET_NOT_FOUND, "Wallet no encontrada");
  return wallet;
};

const getTransactions = async (userId, { limit = 20, offset = 0, type }) => {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet)
    throw new NotFoundError(ERROR_CODES.WALLET_NOT_FOUND, "Wallet no encontrada");

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

  return { transactions, total, limit, offset, currency: wallet.currency };
};

const assertSelfTopUpAllowed = async (user) => {
  if (user.role !== "student") return;
  if (!user.institutionId) return;

  const institution = await prisma.institution.findUnique({
    where: { id: user.institutionId },
    select: { type: true, settings: true },
  });

  if (resolveSettings(institution).studentSelfTopUp) return;

  throw new ForbiddenError(
    ERROR_CODES.WALLET_SELF_TOPUP_DISABLED,
    "Tu saldo proviene de los subsidios de tu institución",
  );
};

const recharge = async ({ userId, amount }) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true, institutionId: true },
  });
  if (!user)
    throw new NotFoundError(ERROR_CODES.USER_NOT_FOUND, "Usuario no encontrado");
  if (!user.isActive)
    throw new ForbiddenError(
      ERROR_CODES.AUTH_ACCOUNT_DISABLED,
      "La cuenta está desactivada",
    );

  await assertSelfTopUpAllowed(user);

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet)
    throw new NotFoundError(ERROR_CODES.WALLET_NOT_FOUND, "Wallet no encontrada");

  const parsedAmount = money(amount);

  return prisma.$transaction(async (tx) => {
    await sessionMoney.rechargeWallet(tx, {
      userId,
      amount: parsedAmount,
      currency: wallet.currency,
      reason: "wallet.manual_recharge",
      description: `Recarga manual de ${parsedAmount.toFixed(2)} ${wallet.currency}`,
    });

    return tx.wallet.findUnique({ where: { userId } });
  });
};

const addSubsidy = async ({ studentId, amount, reason, institutionId }, ctx) => {
  const parsedAmount = money(amount);

  if (
    !ctx.isPlatformAdmin &&
    institutionId &&
    institutionId !== ctx.institutionId
  )
    throw new ForbiddenError(
      ERROR_CODES.INSTITUTION_MISMATCH,
      "No puedes operar sobre otra institución",
    );

  const resolvedInstitutionId = ctx.isPlatformAdmin
    ? institutionId
    : ctx.institutionId;

  if (!resolvedInstitutionId)
    throw new BadRequestError(
      ERROR_CODES.INSTITUTION_REQUIRED,
      "Institución requerida",
    );

  const institution = await prisma.institution.findUnique({
    where: { id: resolvedInstitutionId },
  });
  if (!institution)
    throw new NotFoundError(
      ERROR_CODES.INSTITUTION_NOT_FOUND,
      "Institución no encontrada",
    );

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, role: true, isActive: true, institutionId: true },
  });
  if (!student)
    throw new NotFoundError(ERROR_CODES.USER_NOT_FOUND, "Estudiante no encontrado");
  if (student.role !== "student")
    throw new BadRequestError(
      ERROR_CODES.USER_NOT_STUDENT,
      "El usuario indicado no es un estudiante",
    );
  if (!student.isActive)
    throw new ForbiddenError(
      ERROR_CODES.AUTH_ACCOUNT_DISABLED,
      "La cuenta del estudiante está desactivada",
    );
  if (student.institutionId !== resolvedInstitutionId)
    throw new ForbiddenError(
      ERROR_CODES.INSTITUTION_MISMATCH,
      "El estudiante no pertenece a esta institución",
    );

  if (greaterThan(parsedAmount, institution.balance))
    throw new BadRequestError(
      ERROR_CODES.INSTITUTION_INSUFFICIENT_BALANCE,
      `Saldo insuficiente. La institución tiene ${money(institution.balance).toFixed(2)} ${institution.currencyCode} disponibles`,
      {
        available: toNumber(institution.balance),
        required: toNumber(parsedAmount),
        currencyCode: institution.currencyCode,
      },
    );

  const wallet = await prisma.wallet.findUnique({
    where: { userId: studentId },
  });
  if (!wallet)
    throw new NotFoundError(
      ERROR_CODES.WALLET_NOT_FOUND,
      "Wallet del estudiante no encontrada",
    );

  sessionMoney.assertWalletCurrency(wallet, institution.currencyCode);

  return prisma.$transaction(async (tx) => {
    await sessionMoney.grantSubsidy(tx, {
      institutionId: resolvedInstitutionId,
      studentId,
      amount: parsedAmount,
      currency: institution.currencyCode,
      description: reason || "Subsidio de la institución",
    });

    await tx.subsidy.create({
      data: {
        institutionId: resolvedInstitutionId,
        studentId,
        amount: parsedAmount,
        currency: institution.currencyCode,
        reason,
      },
    });

    return tx.wallet.findUnique({ where: { userId: studentId } });
  });
};

module.exports = {
  getMyWallet,
  getTransactions,
  recharge,
  addSubsidy,
  assertSelfTopUpAllowed,
};
