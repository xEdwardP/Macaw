const prisma = require("../../config/prisma");
const { getPlatformUser } = require("../../config/platform");
const { money, splitCommission, subtract, isPositive } = require("../../shared/money/money");
const ledger = require("../../shared/ledger/ledger");
const accounts = require("../../shared/ledger/accounts");
const { BadRequestError, NotFoundError } = require("../../shared/errors/AppError");
const ERROR_CODES = require("../../shared/errors/codes");

const { DEBIT, CREDIT } = ledger;

const settlementKey = (sessionId) => `session:${sessionId}:settlement`;
const bookingKey = (sessionId) => `session:${sessionId}:booking`;
const refundKey = (sessionId) => `session:${sessionId}:refund`;

const freezeForBooking = async (tx, { session, studentId, tutorName }) =>
  ledger.postEntry(tx, {
    reason: "session.booked",
    idempotencyKey: bookingKey(session.id),
    sessionId: session.id,
    currency: session.currency,
    legs: [
      {
        account: accounts.userWallet(studentId, session.currency),
        direction: DEBIT,
        amount: session.price,
        statement: {
          type: "frozen",
          description: `Sesión reservada con ${tutorName}`,
        },
      },
      {
        account: accounts.userEscrow(studentId, session.currency),
        direction: CREDIT,
        amount: session.price,
      },
    ],
  });

const settleSession = async (tx, session, { reason, description }) => {
  const platform = await getPlatformUser(tx);
  const { commission, net } = splitCommission(
    session.price,
    session.commissionRate,
  );

  const legs = [
    {
      account: accounts.userEscrow(session.studentId, session.currency),
      direction: DEBIT,
      amount: session.price,
      statement: {
        type: "released",
        description: "Pago liberado al tutor",
      },
    },
    {
      account: accounts.userWallet(session.tutorId, session.currency),
      direction: CREDIT,
      amount: net,
      earning: true,
      statement: { type: "released", description },
    },
  ];

  if (isPositive(commission))
    legs.push({
      account: accounts.userWallet(platform.id, session.currency),
      direction: CREDIT,
      amount: commission,
      earning: true,
      statement: { type: "commission", description: reason },
    });

  const entry = await ledger.postEntry(tx, {
    reason,
    idempotencyKey: settlementKey(session.id),
    sessionId: session.id,
    currency: session.currency,
    legs,
  });

  await tx.tutorProfile.update({
    where: { userId: session.tutorId },
    data: { totalSessions: { increment: 1 } },
  });

  return { entry, commission, net };
};

const refundSession = async (
  tx,
  session,
  { refundAmount, tutorCompensation, reason, refundDescription },
) => {
  const legs = [
    {
      account: accounts.userEscrow(session.studentId, session.currency),
      direction: DEBIT,
      amount: session.price,
    },
  ];

  if (isPositive(refundAmount))
    legs.push({
      account: accounts.userWallet(session.studentId, session.currency),
      direction: CREDIT,
      amount: refundAmount,
      statement: { type: "refund", description: refundDescription },
    });

  if (isPositive(tutorCompensation))
    legs.push({
      account: accounts.userWallet(session.tutorId, session.currency),
      direction: CREDIT,
      amount: tutorCompensation,
      earning: true,
      statement: {
        type: "released",
        description:
          "Compensación del 50% por cancelación tardía del estudiante",
      },
    });

  return ledger.postEntry(tx, {
    reason,
    idempotencyKey: refundKey(session.id),
    sessionId: session.id,
    currency: session.currency,
    legs,
  });
};

const rechargeWallet = async (
  tx,
  { userId, amount, currency, description, idempotencyKey, reason },
) =>
  ledger.postEntry(tx, {
    reason,
    idempotencyKey,
    currency,
    legs: [
      {
        account: accounts.externalPayments(currency),
        direction: DEBIT,
        amount,
      },
      {
        account: accounts.userWallet(userId, currency),
        direction: CREDIT,
        amount,
        statement: { type: "recharge", description },
      },
    ],
  });

const grantSubsidy = async (
  tx,
  { institutionId, studentId, amount, currency, description },
) =>
  ledger.postEntry(tx, {
    reason: "wallet.subsidy",
    currency,
    legs: [
      {
        account: accounts.institutionFunds(institutionId, currency),
        direction: DEBIT,
        amount,
      },
      {
        account: accounts.userWallet(studentId, currency),
        direction: CREDIT,
        amount,
        statement: { type: "subsidy", description },
      },
    ],
  });

const payoutWithdrawal = async (
  tx,
  { userId, amount, currency, description, idempotencyKey },
) =>
  ledger.postEntry(tx, {
    reason: "wallet.withdrawal",
    idempotencyKey,
    currency,
    legs: [
      {
        account: accounts.userWallet(userId, currency),
        direction: DEBIT,
        amount,
        statement: { type: "withdrawal", description },
      },
      {
        account: accounts.externalPayouts(currency),
        direction: CREDIT,
        amount,
      },
    ],
  });

const fundInstitution = async (
  tx,
  { institutionId, amount, currency, idempotencyKey, reason },
) =>
  ledger.postEntry(tx, {
    reason,
    idempotencyKey,
    currency,
    legs: [
      {
        account: accounts.externalPayments(currency),
        direction: DEBIT,
        amount,
      },
      {
        account: accounts.institutionFunds(institutionId, currency),
        direction: CREDIT,
        amount,
      },
    ],
  });

const settleSessionById = async (sessionId, { reason, description }) =>
  prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({ where: { id: sessionId } });
    if (!session)
      throw new NotFoundError(ERROR_CODES.SESSION_NOT_FOUND, "Sesión no encontrada");

    await tx.session.update({
      where: { id: sessionId },
      data: { status: "completed" },
    });

    return settleSession(tx, session, { reason, description });
  });

const assertWalletCurrency = (wallet, currency) => {
  if (wallet.currency !== currency)
    throw new BadRequestError(
      ERROR_CODES.WALLET_CURRENCY_MISMATCH,
      "La moneda de la operación no coincide con la de la wallet",
      { walletCurrency: wallet.currency, operationCurrency: currency },
    );
};

module.exports = {
  settlementKey,
  bookingKey,
  refundKey,
  freezeForBooking,
  settleSession,
  settleSessionById,
  refundSession,
  rechargeWallet,
  grantSubsidy,
  payoutWithdrawal,
  fundInstitution,
  assertWalletCurrency,
  money,
  subtract,
};
