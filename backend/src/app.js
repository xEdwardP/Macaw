const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pinoHttp = require("pino-http");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const env = require("./config/env");
const logger = require("./config/logger");
const prisma = require("./config/prisma");
const response = require("./utils/apiResponse");
const asyncHandler = require("./shared/http/asyncHandler");
const { requestIdMiddleware } = require("./shared/http/requestContext");
const {
  errorHandler,
  notFoundHandler,
} = require("./middlewares/error.middleware");
const { ForbiddenError } = require("./shared/errors/AppError");
const ERROR_CODES = require("./shared/errors/codes");

const app = express();

app.set("trust proxy", 1);

app.use(requestIdMiddleware);

app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.id,
    autoLogging: { ignore: (req) => req.url.startsWith("/api/health") },
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
  }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (env.corsOrigins.includes(origin)) return callback(null, true);
      return callback(
        new ForbiddenError(
          ERROR_CODES.CORS_ORIGIN_NOT_ALLOWED,
          "Origen no permitido por CORS",
        ),
      );
    },
    credentials: true,
  }),
);

app.use(helmet());
app.use(express.json({ limit: "100kb" }));

const limiterOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Demasiadas peticiones, intenta más tarde",
    error: { code: ERROR_CODES.RATE_LIMITED },
  },
};

const generalLimiter = rateLimit({
  ...limiterOptions,
  windowMs: 15 * 60 * 1000,
  max: env.isProduction ? 100 : 1000,
  skip: () => env.isTest,
});

const authLimiter = rateLimit({
  ...limiterOptions,
  windowMs: 15 * 60 * 1000,
  max: env.isProduction ? 5 : 100,
  skipSuccessfulRequests: true,
  skip: () => env.isTest,
  message: {
    success: false,
    message: "Demasiados intentos. Espera unos minutos e intenta de nuevo",
    error: { code: ERROR_CODES.RATE_LIMITED },
  },
});

const aiLimiter = rateLimit({
  ...limiterOptions,
  windowMs: 60 * 60 * 1000,
  max: env.isProduction ? 20 : 200,
  skip: () => env.isTest,
  keyGenerator: (req, res) => req.user?.id || ipKeyGenerator(req, res),
  message: {
    success: false,
    message: "Has alcanzado el límite de consultas de IA por hora",
    error: { code: ERROR_CODES.RATE_LIMITED },
  },
});

app.use("/api", generalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/invitations/accept", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);
app.use("/api/auth/verify-email", authLimiter);
app.use("/api/ai", aiLimiter);

app.use("/api/auth", require("./modules/auth/auth.routes"));
app.use("/api/users", require("./modules/users/users.routes"));
app.use("/api/notifications", require("./modules/notifications/notifications.routes"));
app.use("/api/tutors", require("./modules/tutors/tutors.routes"));
app.use("/api/sessions", require("./modules/sessions/sessions.routes"));
app.use("/api/wallet", require("./modules/wallet/wallet.routes"));
app.use("/api/reviews", require("./modules/reviews/reviews.routes"));
app.use("/api/ai", require("./modules/ai/ai.routes"));
app.use("/api/public", require("./modules/public/public.routes"));
app.use("/api/institutions", require("./modules/institutions/institutions.routes"));
app.use(
  "/api/universities",
  require("./modules/institutions/deprecated.routes"),
);
app.use("/api/paypal", require("./modules/wallet/paypal.routes"));
app.use("/api/withdrawals", require("./modules/wallet/withdrawal.routes"));

app.get("/api/health", (req, res) =>
  response.ok(res, { app: "Macaw API" }, "ok"),
);

app.get(
  "/api/health/ready",
  asyncHandler(async (req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    return response.ok(res, { app: "Macaw API", database: "up" }, "ready");
  }),
);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
