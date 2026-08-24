const http = require("http");

const env = require("./config/env");
const logger = require("./config/logger");
const prisma = require("./config/prisma");
const realtime = require("./config/realtime");
const app = require("./app");

const server = http.createServer(app);

realtime.attach(server);

server.listen(env.PORT, () =>
  logger.info(
    { port: env.PORT, env: env.NODE_ENV, uploads: env.uploadsEnabled },
    "Macaw API iniciada",
  ),
);

const shutdown = (signal) => {
  logger.info({ signal }, "Cerrando servidor");

  server.close(async () => {
    await realtime.close();
    await prisma.$disconnect();
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Promesa rechazada sin manejar");
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Excepción no capturada");
  shutdown("uncaughtException");
});

module.exports = server;
