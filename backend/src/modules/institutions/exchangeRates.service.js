const prisma = require("../../config/prisma");
const audit = require("../../shared/audit/audit");
const { BadRequestError } = require("../../shared/errors/AppError");
const ERROR_CODES = require("../../shared/errors/codes");

const list = ({ fromCurrency, toCurrency, limit = 50 }) =>
  prisma.exchangeRate.findMany({
    where: {
      ...(fromCurrency ? { fromCurrency } : {}),
      ...(toCurrency ? { toCurrency } : {}),
    },
    orderBy: { validFrom: "desc" },
    take: limit,
  });

const latest = async (fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) return { rate: 1, fromCurrency, toCurrency };

  const rate = await prisma.exchangeRate.findFirst({
    where: { fromCurrency, toCurrency, validFrom: { lte: new Date() } },
    orderBy: { validFrom: "desc" },
  });

  return rate;
};

const create = async (ctx, { fromCurrency, toCurrency, rate, source, validFrom }) => {
  if (fromCurrency === toCurrency)
    throw new BadRequestError(
      ERROR_CODES.EXCHANGE_RATE_INVALID,
      "El tipo de cambio necesita dos monedas distintas",
    );

  const currencies = await prisma.currency.findMany({
    where: { code: { in: [fromCurrency, toCurrency] } },
    select: { code: true },
  });

  if (currencies.length !== 2)
    throw new BadRequestError(
      ERROR_CODES.CURRENCY_NOT_FOUND,
      "Alguna de las monedas no existe en el catálogo",
    );

  const created = await prisma.exchangeRate.create({
    data: {
      fromCurrency,
      toCurrency,
      rate,
      source: source || "manual",
      ...(validFrom ? { validFrom } : {}),
    },
  });

  await audit.record(prisma, {
    actorId: audit.actorOf(ctx),
    action: "exchange_rate.created",
    entity: "ExchangeRate",
    entityId: created.id,
    metadata: { fromCurrency, toCurrency, rate: String(rate) },
  });

  return created;
};

module.exports = { list, latest, create };
