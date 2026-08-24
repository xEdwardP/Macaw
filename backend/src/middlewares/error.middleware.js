const { Prisma } = require("@prisma/client");
const { MulterError } = require("multer");
const {
  AppError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  InternalError,
} = require("../shared/errors/AppError");
const ERROR_CODES = require("../shared/errors/codes");
const logger = require("../config/logger");

const PRISMA_STATUS = {
  P2002: () =>
    new ConflictError(
      ERROR_CODES.VALIDATION,
      "Ya existe un registro con esos datos",
    ),
  P2003: () =>
    new ConflictError(
      ERROR_CODES.VALIDATION,
      "La operación viola una referencia existente",
    ),
  P2025: () =>
    new NotFoundError(ERROR_CODES.NOT_FOUND, "El registro no existe"),
};

const MULTER_ERRORS = {
  LIMIT_FILE_SIZE: () =>
    new BadRequestError(
      ERROR_CODES.UPLOAD_FILE_TOO_LARGE,
      "La imagen pesa demasiado",
    ),
  LIMIT_FILE_COUNT: () =>
    new BadRequestError(ERROR_CODES.UPLOAD_FILE_REQUIRED, "Envía una sola imagen"),
  LIMIT_UNEXPECTED_FILE: () =>
    new BadRequestError(ERROR_CODES.UPLOAD_FILE_REQUIRED, "Campo de archivo inesperado"),
};

const toAppError = (err) => {
  if (err instanceof AppError) return err;

  if (err instanceof MulterError) {
    const build = MULTER_ERRORS[err.code];
    if (build) return build();
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const build = PRISMA_STATUS[err.code];
    if (build) return build();
  }

  return new InternalError();
};

const notFoundHandler = (req, res, next) => {
  next(new NotFoundError(ERROR_CODES.NOT_FOUND, "Recurso no encontrado"));
};

const errorHandler = (err, req, res, next) => {
  const appError = toAppError(err);

  const logPayload = {
    err: {
      name: err.name,
      code: appError.code,
      status: appError.status,
      message: err.message,
      stack: err.stack,
    },
    method: req.method,
    path: req.originalUrl,
    userId: req.user?.id,
  };

  if (appError.status >= 500) logger.error(logPayload, "Error no controlado");
  else logger.warn(logPayload, "Petición rechazada");

  return res.status(appError.status).json(appError.toResponse());
};

module.exports = { errorHandler, notFoundHandler, toAppError };
