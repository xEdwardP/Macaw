const pino = require("pino");
const env = require("./env");
const { getRequestId } = require("../shared/http/requestContext");

const redact = {
  paths: [
    "req.headers.authorization",
    "req.headers.cookie",
    "req.body.password",
    "req.body.currentPassword",
    "req.body.newPassword",
    "password",
    "token",
    "paypalClientSecret",
  ],
  censor: "[redactado]",
};

const logger = pino({
  level: env.isTest ? "silent" : env.LOG_LEVEL,
  redact,
  base: undefined,
  mixin: () => {
    const requestId = getRequestId();
    return requestId ? { requestId } : {};
  },
  transport: env.isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
      },
});

module.exports = logger;
