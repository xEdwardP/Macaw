const { verify } = require("../utils/jwt");
const prisma = require("../config/prisma");
const {
  ForbiddenError,
  UnauthorizedError,
} = require("../shared/errors/AppError");
const ERROR_CODES = require("../shared/errors/codes");
const asyncHandler = require("../shared/http/asyncHandler");

const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    throw new UnauthorizedError(
      ERROR_CODES.AUTH_TOKEN_MISSING,
      "Token requerido",
    );

  const token = header.split(" ")[1];

  let payload;
  try {
    payload = verify(token);
  } catch {
    throw new UnauthorizedError(
      ERROR_CODES.AUTH_TOKEN_INVALID,
      "Token inválido o expirado",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatar: true,
      institutionId: true,
      academicUnitId: true,
      isActive: true,
    },
  });

  if (!user)
    throw new UnauthorizedError(
      ERROR_CODES.AUTH_TOKEN_INVALID,
      "Token inválido o expirado",
    );

  if (!user.isActive)
    throw new ForbiddenError(
      ERROR_CODES.AUTH_ACCOUNT_DISABLED,
      "Tu cuenta está desactivada. Contacta a tu institución.",
    );

  req.user = user;
  next();
});

const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user?.role))
      return next(
        new ForbiddenError(ERROR_CODES.AUTH_ROLE_NOT_ALLOWED, "Acceso denegado"),
      );
    next();
  };

module.exports = { authenticate, authorize };
