const { Prisma } = require("@prisma/client");

const Decimal = Prisma.Decimal;

const SCALE = 2;

const toDecimal = (value) =>
  value instanceof Decimal ? value : new Decimal(value ?? 0);

const money = (value) => toDecimal(value).toDecimalPlaces(SCALE, Decimal.ROUND_HALF_UP);

const add = (...values) =>
  money(values.reduce((total, value) => total.plus(toDecimal(value)), new Decimal(0)));

const subtract = (a, b) => money(toDecimal(a).minus(toDecimal(b)));

const multiply = (a, b) => money(toDecimal(a).times(toDecimal(b)));

const isNegative = (value) => toDecimal(value).isNegative();

const isZero = (value) => toDecimal(value).isZero();

const isPositive = (value) => toDecimal(value).greaterThan(0);

const equals = (a, b) => money(a).equals(money(b));

const greaterThan = (a, b) => money(a).greaterThan(money(b));

const lessThan = (a, b) => money(a).lessThan(money(b));

const toNumber = (value) => money(value).toNumber();

const format = (value, currency) => `${money(value).toFixed(SCALE)} ${currency}`;

const splitCommission = (price, rate) => {
  const commission = multiply(price, rate);
  return { commission, net: subtract(price, commission) };
};

module.exports = {
  Decimal,
  SCALE,
  money,
  add,
  subtract,
  multiply,
  isNegative,
  isZero,
  isPositive,
  equals,
  greaterThan,
  lessThan,
  toNumber,
  format,
  splitCommission,
};
