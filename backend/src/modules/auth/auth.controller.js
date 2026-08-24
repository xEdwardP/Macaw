const service = require("./auth.service");
const account = require("./account.service");
const response = require("../../utils/apiResponse");
const asyncHandler = require("../../shared/http/asyncHandler");

const register = asyncHandler(async (req, res) => {
  const result = await service.register(req.body);
  return response.created(res, result, "Cuenta creada");
});

const login = asyncHandler(async (req, res) => {
  const result = await service.login(req.body);
  return response.ok(res, result, "Sesión iniciada");
});

const profile = asyncHandler(async (req, res) =>
  response.ok(res, await service.getProfile(req.user.id)),
);

const forgotPassword = asyncHandler(async (req, res) =>
  response.ok(
    res,
    await account.requestPasswordReset(req.body),
    "Si el correo existe, enviamos las instrucciones",
  ),
);

const resetPassword = asyncHandler(async (req, res) =>
  response.ok(res, await account.resetPassword(req.body), "Contraseña cambiada"),
);

const changePassword = asyncHandler(async (req, res) =>
  response.ok(
    res,
    await account.changePassword(req.user.id, req.body),
    "Contraseña cambiada",
  ),
);

const resendVerification = asyncHandler(async (req, res) =>
  response.ok(
    res,
    await account.requestEmailVerification(req.user.id),
    "Correo de verificación enviado",
  ),
);

const verifyEmail = asyncHandler(async (req, res) =>
  response.ok(res, await account.verifyEmail(req.body), "Correo verificado"),
);

module.exports = {
  register,
  login,
  profile,
  forgotPassword,
  resetPassword,
  changePassword,
  resendVerification,
  verifyEmail,
};
