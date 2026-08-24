const { money, add, isPositive, equals, toNumber } = require("../money/money");
const { ACCOUNT_KINDS, accountKey } = require("./accounts");
const { ConflictError, InternalError } = require("../errors/AppError");
const ERROR_CODES = require("../errors/codes");

const DEBIT = "debit";
const CREDIT = "credit";

const SIGN_BY_DIRECTION = { [CREDIT]: 1, [DEBIT]: -1 };

const resolveAccount = async (tx, spec) => {
  const key = accountKey(spec);

  const existing = await tx.ledgerAccount.findUnique({ where: { key } });
  if (existing) return existing;

  return tx.ledgerAccount.create({
    data: {
      key,
      kind: spec.kind,
      currency: spec.currency,
      userId: spec.userId ?? null,
      institutionId: spec.institutionId ?? null,
    },
  });
};

const assertBalanced = (legs, currency) => {
  if (legs.length < 2)
    throw new InternalError(
      ERROR_CODES.LEDGER_UNBALANCED,
      "Un asiento contable necesita al menos dos movimientos",
    );

  for (const leg of legs) {
    if (!isPositive(leg.amount))
      throw new InternalError(
        ERROR_CODES.LEDGER_INVALID_AMOUNT,
        "Todo movimiento contable debe tener un monto positivo",
      );

    if (leg.account.currency !== currency)
      throw new InternalError(
        ERROR_CODES.LEDGER_CURRENCY_MISMATCH,
        "Un asiento contable no puede mezclar monedas",
      );
  }

  const debits = add(
    ...legs.filter((leg) => leg.direction === DEBIT).map((leg) => leg.amount),
  );
  const credits = add(
    ...legs.filter((leg) => leg.direction === CREDIT).map((leg) => leg.amount),
  );

  if (!equals(debits, credits))
    throw new InternalError(
      ERROR_CODES.LEDGER_UNBALANCED,
      `Asiento descuadrado: débitos ${toNumber(debits)} contra créditos ${toNumber(credits)}`,
    );
};

const applyProjection = async (tx, leg, account, sessionId) => {
  const signed = money(leg.amount).times(SIGN_BY_DIRECTION[leg.direction]);

  if (account.kind === ACCOUNT_KINDS.INSTITUTION_FUNDS) {
    await tx.institution.update({
      where: { id: account.institutionId },
      data: { balance: { increment: signed } },
    });
    return;
  }

  if (!account.userId) return;

  const wallet = await tx.wallet.findUnique({
    where: { userId: account.userId },
    select: { id: true, currency: true },
  });

  if (!wallet || wallet.currency !== account.currency) return;

  if (account.kind === ACCOUNT_KINDS.USER_WALLET)
    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { increment: signed },
        ...(leg.earning && { lifetimeEarned: { increment: signed } }),
      },
    });

  if (account.kind === ACCOUNT_KINDS.USER_ESCROW)
    await tx.wallet.update({
      where: { id: wallet.id },
      data: { frozen: { increment: signed } },
    });

  if (!leg.statement) return;

  await tx.transaction.create({
    data: {
      walletId: wallet.id,
      type: leg.statement.type,
      amount: money(leg.amount),
      currency: account.currency,
      description: leg.statement.description,
      sessionId: sessionId ?? null,
      ledgerTransactionId: leg.ledgerTransactionId,
    },
  });
};

const postEntry = async (
  tx,
  { reason, idempotencyKey = null, sessionId = null, currency, legs, metadata },
) => {
  const accounts = [];
  for (const leg of legs) accounts.push(await resolveAccount(tx, leg.account));

  assertBalanced(
    legs.map((leg, index) => ({ ...leg, account: accounts[index] })),
    currency,
  );

  let ledgerTransaction;
  try {
    ledgerTransaction = await tx.ledgerTransaction.create({
      data: { reason, idempotencyKey, sessionId, metadata },
    });
  } catch (err) {
    if (err.code === "P2002")
      throw new ConflictError(
        ERROR_CODES.LEDGER_DUPLICATE_ENTRY,
        "Esta operación ya fue registrada",
        { idempotencyKey },
      );
    throw err;
  }

  for (const [index, leg] of legs.entries()) {
    const account = accounts[index];

    await tx.ledgerEntry.create({
      data: {
        ledgerTransactionId: ledgerTransaction.id,
        accountId: account.id,
        direction: leg.direction,
        amount: money(leg.amount),
        currency: account.currency,
        sessionId,
      },
    });

    await applyProjection(
      tx,
      { ...leg, ledgerTransactionId: ledgerTransaction.id },
      account,
      sessionId,
    );
  }

  return ledgerTransaction;
};

const alreadyPosted = async (client, idempotencyKey) => {
  const existing = await client.ledgerTransaction.findUnique({
    where: { idempotencyKey },
    select: { id: true },
  });
  return Boolean(existing);
};

const accountBalance = async (client, spec) => {
  const account = await client.ledgerAccount.findUnique({
    where: { key: accountKey(spec) },
    select: { id: true },
  });
  if (!account) return money(0);

  const [credits, debits] = await Promise.all([
    client.ledgerEntry.aggregate({
      where: { accountId: account.id, direction: CREDIT },
      _sum: { amount: true },
    }),
    client.ledgerEntry.aggregate({
      where: { accountId: account.id, direction: DEBIT },
      _sum: { amount: true },
    }),
  ]);

  return money(credits._sum.amount || 0).minus(money(debits._sum.amount || 0));
};

module.exports = {
  DEBIT,
  CREDIT,
  postEntry,
  alreadyPosted,
  accountBalance,
  resolveAccount,
};
