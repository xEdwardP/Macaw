const cron = require("node-cron");

const env = require("./config/env");
const logger = require("./config/logger");
const prisma = require("./config/prisma");
const { runAutoConfirm } = require("./jobs/autoConfirm");
const { runSessionReminders } = require("./jobs/sessionReminders");
const { runOutboxDispatcher } = require("./jobs/outboxDispatcher");
const {
  runReconcileSubscriptions,
} = require("./jobs/reconcileSubscriptions");

const LOCK_IDS = {
  autoConfirm: 811001,
  sessionReminders: 811002,
  outboxDispatcher: 811003,
  reconcileSubscriptions: 811004,
};

const withAdvisoryLock = async (lockId, name, task) => {
  const [{ locked }] = await prisma.$queryRaw`
    SELECT pg_try_advisory_lock(${lockId}::bigint) AS locked
  `;

  if (!locked) {
    logger.debug({ job: name }, "Job omitido: otra instancia lo tiene tomado");
    return null;
  }

  try {
    return await task();
  } catch (err) {
    logger.error({ job: name, err: err.message }, "El job falló");
    return null;
  } finally {
    await prisma.$queryRaw`SELECT pg_advisory_unlock(${lockId}::bigint)`;
  }
};

const schedule = (expression, lockId, name, task) =>
  cron.schedule(expression, () => withAdvisoryLock(lockId, name, task));

const start = () => {
  schedule("0 * * * *", LOCK_IDS.autoConfirm, "autoConfirm", runAutoConfirm);
  schedule(
    "0 8 * * *",
    LOCK_IDS.sessionReminders,
    "sessionReminders",
    runSessionReminders,
  );
  schedule(
    "* * * * *",
    LOCK_IDS.outboxDispatcher,
    "outboxDispatcher",
    () => runOutboxDispatcher(),
  );

  schedule(
    "30 3 * * *",
    LOCK_IDS.reconcileSubscriptions,
    "reconcileSubscriptions",
    runReconcileSubscriptions,
  );

  logger.info({ env: env.NODE_ENV }, "Macaw worker iniciado");
};

const shutdown = async (signal) => {
  logger.info({ signal }, "Cerrando worker");
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Promesa rechazada sin manejar en el worker");
});

if (require.main === module) start();

module.exports = { start, withAdvisoryLock, LOCK_IDS };
