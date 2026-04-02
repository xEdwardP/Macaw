const { verify } = require("../utils/jwt");
const { unauthorized, forbidden } = require("../utils/apiResponse");
const prisma = require("../config/prisma");

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer "))
      return unauthorized(res, "Token requerido");

    const token = header.split(" ")[1];
    const payload = verify(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        universityId: true,
        isActive: true,
      },
    });

    if (!user) return unauthorized(res, "Token inválido o expirado");
    if (!user.isActive)
      return unauthorized(
        res,
        "Tu cuenta está desactivada. Contacta a tu institución.",
      );

    req.user = user;
    next();
  } catch {
    return unauthorized(res, "Token inválido o expirado");
  }
};

const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user?.role)) return forbidden(res);
    next();
  };

module.exports = { authenticate, authorize };
