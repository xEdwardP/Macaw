const prisma = require("../../config/prisma");
const { sendMail } = require("../../config/mailer");
const templates = require("../../utils/emailTemplates");
const {
  localeForEmail,
  localeForUser,
} = require("../../shared/i18n/recipients");
const ledger = require("../../shared/ledger/ledger");
const accounts = require("../../shared/ledger/accounts");
const { money, greaterThan, toNumber } = require("../../shared/money/money");
const { resolveSettings } = require("../../config/institutionSettings");
const {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} = require("../../shared/errors/AppError");
const ERROR_CODES = require("../../shared/errors/codes");

const { DEBIT, CREDIT } = ledger;

const getAll = async (user) => {
  const where = user.role === "platform_admin" ? {} : { userId: user.id };
  return prisma.withdrawalRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, name: true, email: true, paypalEmail: true },
      },
    },
  });
};

const assertWithdrawalsAllowed = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { institutionId: true },
  });
  if (!user?.institutionId) return;

  const institution = await prisma.institution.findUnique({
    where: { id: user.institutionId },
    select: { type: true, settings: true },
  });

  if (resolveSettings(institution).tutorWithdrawals) return;

  throw new ForbiddenError(
    ERROR_CODES.WITHDRAWALS_DISABLED,
    "Tu institución no permite retiros. Contacta a tu coordinador.",
  );
};

const holdLegs = (userId, currency, amount, description) => [
  {
    account: accounts.userWallet(userId, currency),
    direction: DEBIT,
    amount,
    statement: { type: "frozen", description },
  },
  {
    account: accounts.userEscrow(userId, currency),
    direction: CREDIT,
    amount,
  },
];

const create = async (userId, { amount, paypalEmail }) => {
  await assertWithdrawalsAllowed(userId);

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet)
    throw new NotFoundError(ERROR_CODES.WALLET_NOT_FOUND, "Wallet no encontrada");

  const parsedAmount = money(amount);

  if (greaterThan(parsedAmount, wallet.balance))
    throw new BadRequestError(
      ERROR_CODES.WALLET_INSUFFICIENT_BALANCE,
      "Saldo insuficiente",
      {
        required: toNumber(parsedAmount),
        available: toNumber(wallet.balance),
        currency: wallet.currency,
      },
    );

  const existing = await prisma.withdrawalRequest.findFirst({
    where: { userId, status: "pending" },
  });
  if (existing)
    throw new ConflictError(
      ERROR_CODES.WITHDRAWAL_ALREADY_PENDING,
      "Ya tienes una solicitud de retiro pendiente",
    );

  const request = await prisma.$transaction(async (tx) => {
    const newRequest = await tx.withdrawalRequest.create({
      data: {
        userId,
        amount: parsedAmount,
        currency: wallet.currency,
        paypalEmail,
        status: "pending",
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    await ledger.postEntry(tx, {
      reason: "withdrawal.requested",
      idempotencyKey: `withdrawal:${newRequest.id}:hold`,
      currency: wallet.currency,
      legs: holdLegs(
        userId,
        wallet.currency,
        parsedAmount,
        `Retiro solicitado a PayPal: ${paypalEmail}`,
      ),
    });

    return newRequest;
  });

  const admins = await prisma.user.findMany({
    where: { role: "platform_admin", email: { not: "platform@macaw.app" } },
    include: { institution: { select: { locale: true } } },
  });

  for (const admin of admins) {
    await sendMail({
      to: admin.email,
      ...templates.withdrawalRequested(
        {
          adminName: admin.name,
          tutorName: request.user.name,
          amount: toNumber(parsedAmount),
          currency: wallet.currency,
          paypalEmail,
        },
        localeForUser(admin),
      ),
    });
  }

  return request;
};

const loadPendingRequest = async (requestId) => {
  const request = await prisma.withdrawalRequest.findUnique({
    where: { id: requestId },
    include: { user: { include: { wallet: true } } },
  });

  if (!request)
    throw new NotFoundError(
      ERROR_CODES.WITHDRAWAL_NOT_FOUND,
      "Solicitud no encontrada",
    );
  if (request.status !== "pending")
    throw new ConflictError(
      ERROR_CODES.WITHDRAWAL_ALREADY_PROCESSED,
      "La solicitud ya fue procesada",
    );

  return request;
};

const approve = async (requestId) => {
  const request = await loadPendingRequest(requestId);

  await prisma.$transaction(async (tx) => {
    await tx.withdrawalRequest.update({
      where: { id: requestId },
      data: { status: "approved" },
    });

    await ledger.postEntry(tx, {
      reason: "withdrawal.approved",
      idempotencyKey: `withdrawal:${requestId}:payout`,
      currency: request.currency,
      legs: [
        {
          account: accounts.userEscrow(request.userId, request.currency),
          direction: DEBIT,
          amount: request.amount,
          statement: {
            type: "withdrawal",
            description: `Retiro aprobado a PayPal: ${request.paypalEmail}`,
          },
        },
        {
          account: accounts.externalPayouts(request.currency),
          direction: CREDIT,
          amount: request.amount,
        },
      ],
    });
  });

  await sendMail({
    to: request.user.email,
    ...templates.withdrawalApproved(
      {
        tutorName: request.user.name,
        amount: toNumber(request.amount),
        currency: request.currency,
        paypalEmail: request.paypalEmail,
      },
      await localeForEmail(request.user.email),
    ),
  });

  return prisma.withdrawalRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
};

const reject = async (requestId, notes) => {
  const request = await loadPendingRequest(requestId);

  await prisma.$transaction(async (tx) => {
    await tx.withdrawalRequest.update({
      where: { id: requestId },
      data: { status: "rejected", notes },
    });

    await ledger.postEntry(tx, {
      reason: "withdrawal.rejected",
      idempotencyKey: `withdrawal:${requestId}:release`,
      currency: request.currency,
      legs: [
        {
          account: accounts.userEscrow(request.userId, request.currency),
          direction: DEBIT,
          amount: request.amount,
        },
        {
          account: accounts.userWallet(request.userId, request.currency),
          direction: CREDIT,
          amount: request.amount,
          statement: {
            type: "refund",
            description: "Retiro rechazado - monto devuelto al wallet",
          },
        },
      ],
    });
  });

  await sendMail({
    to: request.user.email,
    ...templates.withdrawalRejected(
      {
        tutorName: request.user.name,
        amount: toNumber(request.amount),
        currency: request.currency,
        notes,
      },
      await localeForEmail(request.user.email),
    ),
  });

  return prisma.withdrawalRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
};

module.exports = { getAll, create, approve, reject, assertWithdrawalsAllowed };
