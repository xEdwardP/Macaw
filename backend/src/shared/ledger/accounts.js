const ACCOUNT_KINDS = {
  USER_WALLET: "user_wallet",
  USER_ESCROW: "user_escrow",
  INSTITUTION_FUNDS: "institution_funds",
  EXTERNAL_PAYMENTS: "external_payments",
  EXTERNAL_PAYOUTS: "external_payouts",
  OPENING_BALANCE: "opening_balance",
};

const OWNED_BY_USER = new Set([
  ACCOUNT_KINDS.USER_WALLET,
  ACCOUNT_KINDS.USER_ESCROW,
]);

const OWNED_BY_INSTITUTION = new Set([ACCOUNT_KINDS.INSTITUTION_FUNDS]);

const accountKey = ({ kind, currency, userId, institutionId }) => {
  if (OWNED_BY_USER.has(kind)) return `${kind}:${currency}:${userId}`;
  if (OWNED_BY_INSTITUTION.has(kind)) return `${kind}:${currency}:${institutionId}`;
  return `${kind}:${currency}:system`;
};

const userWallet = (userId, currency) => ({
  kind: ACCOUNT_KINDS.USER_WALLET,
  userId,
  currency,
});

const userEscrow = (userId, currency) => ({
  kind: ACCOUNT_KINDS.USER_ESCROW,
  userId,
  currency,
});

const institutionFunds = (institutionId, currency) => ({
  kind: ACCOUNT_KINDS.INSTITUTION_FUNDS,
  institutionId,
  currency,
});

const externalPayments = (currency) => ({
  kind: ACCOUNT_KINDS.EXTERNAL_PAYMENTS,
  currency,
});

const externalPayouts = (currency) => ({
  kind: ACCOUNT_KINDS.EXTERNAL_PAYOUTS,
  currency,
});

module.exports = {
  ACCOUNT_KINDS,
  OWNED_BY_USER,
  OWNED_BY_INSTITUTION,
  accountKey,
  userWallet,
  userEscrow,
  institutionFunds,
  externalPayments,
  externalPayouts,
};
