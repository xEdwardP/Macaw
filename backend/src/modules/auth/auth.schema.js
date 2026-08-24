const { z } = require("zod");
const { email, id, optionalId, password } = require("../../shared/validation/common");

const registerSchema = {
  body: z.object({
    name: z.string().trim().min(2, "Nombre muy corto").max(120),
    email,
    password,
    role: z.enum(["student", "tutor"], { message: "Rol inválido" }),
    academicUnitId: optionalId,
  }),
};

const loginSchema = {
  body: z.object({
    email,
    password: z.string().min(1, "La contraseña es obligatoria"),
  }),
};

const forgotPasswordSchema = { body: z.object({ email }) };

const resetPasswordSchema = {
  body: z.object({
    token: z.string().trim().min(20, "Token inválido"),
    password,
  }),
};

const changePasswordSchema = {
  body: z.object({
    currentPassword: z.string().min(1, "La contraseña actual es obligatoria"),
    newPassword: password,
  }),
};

const verifyEmailSchema = {
  body: z.object({ token: z.string().trim().min(20, "Token inválido") }),
};

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
};
