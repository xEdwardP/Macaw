const prisma = require("../../config/prisma");
const { money, equals, toNumber } = require("../money/money");
const { ACCOUNT_KINDS } = require("./accounts");

const CREDIT = "credit";
const DEBIT = "debit";

const balancesByAccount = async (client) => {
  const grouped = await client.ledgerEntry.groupBy({
    by: ["accountId", "direction"],
    _sum: { amount: true },
  });

  const balances = new Map();
  for (const row of grouped) {
    const current = balances.get(row.accountId) || money(0);
    const amount = money(row._sum.amount || 0);
    balances.set(
      row.accountId,
      row.direction === CREDIT ? current.plus(amount) : current.minus(amount),
    );
  }

  return balances;
};

const unbalancedTransactions = async (client) => {
  const grouped = await client.ledgerEntry.groupBy({
    by: ["ledgerTransactionId", "direction"],
    _sum: { amount: true },
  });

  const totals = new Map();
  for (const row of grouped) {
    const current = totals.get(row.ledgerTransactionId) || {
      debit: money(0),
      credit: money(0),
    };
    current[row.direction] = current[row.direction].plus(
      money(row._sum.amount || 0),
    );
    totals.set(row.ledgerTransactionId, current);
  }

  return [...totals.entries()]
    .filter(([, sides]) => !equals(sides.debit, sides.credit))
    .map(([id, sides]) => ({
      ledgerTransactionId: id,
      debit: toNumber(sides.debit),
      credit: toNumber(sides.credit),
    }));
};

const reconcile = async (client = prisma) => {
  const [accounts, balances, wallets, institutions] = await Promise.all([
    client.ledgerAccount.findMany(),
    balancesByAccount(client),
    client.wallet.findMany({
      select: { userId: true, currency: true, balance: true, frozen: true },
    }),
    client.institution.findMany({ select: { id: true, balance: true } }),
  ]);

  const walletByUser = new Map(wallets.map((w) => [w.userId, w]));
  const institutionById = new Map(institutions.map((i) => [i.id, i]));

  const mismatches = [];

  for (const account of accounts) {
    const ledgerBalance = balances.get(account.id) || money(0);

    if (account.kind === ACCOUNT_KINDS.USER_WALLET) {
      const wallet = walletByUser.get(account.userId);
      if (
        wallet &&
        wallet.currency === account.currency &&
        !equals(wallet.balance, ledgerBalance)
      )
        mismatches.push({
          account: account.key,
          projection: toNumber(wallet.balance),
          ledger: toNumber(ledgerBalance),
        });
    }

    if (account.kind === ACCOUNT_KINDS.USER_ESCROW) {
      const wallet = walletByUser.get(account.userId);
      if (
        wallet &&
        wallet.currency === account.currency &&
        !equals(wallet.frozen, ledgerBalance)
      )
        mismatches.push({
          account: account.key,
          projection: toNumber(wallet.frozen),
          ledger: toNumber(ledgerBalance),
        });
    }

    if (account.kind === ACCOUNT_KINDS.INSTITUTION_FUNDS) {
      const institution = institutionById.get(account.institutionId);
      if (institution && !equals(institution.balance, ledgerBalance))
        mismatches.push({
          account: account.key,
          projection: toNumber(institution.balance),
          ledger: toNumber(ledgerBalance),
        });
    }
  }

  const unbalanced = await unbalancedTransactions(client);

  const [credits, debits] = await Promise.all([
    client.ledgerEntry.aggregate({
      where: { direction: CREDIT },
      _sum: { amount: true },
    }),
    client.ledgerEntry.aggregate({
      where: { direction: DEBIT },
      _sum: { amount: true },
    }),
  ]);

  return {
    balanced:
      unbalanced.length === 0 &&
      equals(credits._sum.amount || 0, debits._sum.amount || 0),
    totalDebits: toNumber(debits._sum.amount || 0),
    totalCredits: toNumber(credits._sum.amount || 0),
    unbalancedTransactions: unbalanced,
    projectionMismatches: mismatches,
  };
};

module.exports = { reconcile, balancesByAccount, unbalancedTransactions };
