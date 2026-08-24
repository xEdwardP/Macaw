const prisma = require("../../config/prisma");

const BACKOFF_SECONDS = [30, 120, 600, 3600];
const MAX_ATTEMPTS = BACKOFF_SECONDS.length + 1;

const publish = (client, type, payload) =>
  client.outboxEvent.create({ data: { type, payload } });

const claimBatch = async (limit = 20, client = prisma) => {
  const pending = await client.outboxEvent.findMany({
    where: { status: "pending", availableAt: { lte: new Date() } },
    orderBy: { availableAt: "asc" },
    take: limit,
    select: { id: true },
  });

  if (pending.length === 0) return [];

  const ids = pending.map((event) => event.id);

  await client.outboxEvent.updateMany({
    where: { id: { in: ids }, status: "pending" },
    data: { status: "processing" },
  });

  return client.outboxEvent.findMany({ where: { id: { in: ids } } });
};

const markDelivered = (event, client = prisma) =>
  client.outboxEvent.update({
    where: { id: event.id },
    data: { status: "delivered", deliveredAt: new Date(), lastError: null },
  });

const markFailed = (event, error, client = prisma) => {
  const attempts = event.attempts + 1;
  const exhausted = attempts >= MAX_ATTEMPTS;

  const delaySeconds =
    BACKOFF_SECONDS[Math.min(attempts - 1, BACKOFF_SECONDS.length - 1)];

  return client.outboxEvent.update({
    where: { id: event.id },
    data: {
      status: exhausted ? "failed" : "pending",
      attempts,
      lastError: String(error?.message || error).slice(0, 500),
      availableAt: new Date(Date.now() + delaySeconds * 1000),
    },
  });
};

module.exports = {
  publish,
  claimBatch,
  markDelivered,
  markFailed,
  MAX_ATTEMPTS,
  BACKOFF_SECONDS,
};
