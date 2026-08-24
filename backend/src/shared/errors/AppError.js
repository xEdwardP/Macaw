const ERROR_CODES = require("./codes");

class AppError extends Error {
  constructor(code, message, status = 400, params) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.params = params;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  toResponse() {
    return {
      success: false,
      message: this.message,
      error: {
        code: this.code,
        ...(this.params ? { params: this.params } : {}),
      },
    };
  }
}

class BadRequestError extends AppError {
  constructor(code, message, params) {
    super(code, message, 400, params);
  }
}

class UnauthorizedError extends AppError {
  constructor(code, message, params) {
    super(code, message, 401, params);
  }
}

class ForbiddenError extends AppError {
  constructor(code, message, params) {
    super(code, message, 403, params);
  }
}

class NotFoundError extends AppError {
  constructor(code, message, params) {
    super(code, message, 404, params);
  }
}

class ConflictError extends AppError {
  constructor(code, message, params) {
    super(code, message, 409, params);
  }
}

class GoneError extends AppError {
  constructor(code, message, params) {
    super(code, message, 410, params);
  }
}

class ValidationError extends AppError {
  constructor(issues, message = "Datos inválidos") {
    super(ERROR_CODES.VALIDATION, message, 422, { issues });
  }
}

class ServiceUnavailableError extends AppError {
  constructor(code, message, params) {
    super(code, message, 503, params);
  }
}

class TooManyRequestsError extends AppError {
  constructor(message = "Demasiadas peticiones, intenta más tarde") {
    super(ERROR_CODES.RATE_LIMITED, message, 429);
  }
}

class InternalError extends AppError {
  constructor(
    code = ERROR_CODES.INTERNAL,
    message = "Error interno del servidor",
  ) {
    super(code, message, 500);
    this.isOperational = false;
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  GoneError,
  ValidationError,
  ServiceUnavailableError,
  TooManyRequestsError,
  InternalError,
};
