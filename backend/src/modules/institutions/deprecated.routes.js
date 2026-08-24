const router = require("express").Router();
const logger = require("../../config/logger");
const institutionsRouter = require("./institutions.routes");
const { GoneError } = require("../../shared/errors/AppError");
const ERROR_CODES = require("../../shared/errors/codes");

const SUNSET = new Date(Date.UTC(2027, 1, 28, 23, 59, 59)).toUTCString();

const RESHAPED = [
  { pattern: /^\/faculties(\/|$)/, successor: "/api/institutions/units" },
  { pattern: /^\/list$/, successor: "/api/institutions" },
];

router.use((req, res, next) => {
  res.set("Deprecation", "true");
  res.set("Sunset", SUNSET);
  res.set("Link", '</api/institutions>; rel="successor-version"');

  logger.warn(
    { method: req.method, path: req.originalUrl, ip: req.ip },
    "Uso de endpoint deprecado /api/universities",
  );

  const reshaped = RESHAPED.find(({ pattern }) => pattern.test(req.path));

  if (reshaped)
    return next(
      new GoneError(
        ERROR_CODES.ENDPOINT_GONE,
        `Este endpoint cambió de forma al migrar a instituciones. Usa ${reshaped.successor}.`,
        { successor: reshaped.successor },
      ),
    );

  next();
});

router.use(institutionsRouter);

module.exports = router;
