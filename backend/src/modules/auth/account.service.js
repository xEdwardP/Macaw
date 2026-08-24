const bcrypt = require("bcryptjs");
const prisma = require("../../config/prisma");
const outbox = require("../../shared/events/outbox");
const tokens = require("./userTokens.service");
const {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
} = require("../../shared/errors/AppError");
const ERROR_CODES = require("../../shared/errors/codes");

const localeOf = (user) => user.locale || user.institution?.locale || "es";

const recipient = async (email) =>
  prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      locale: true,
      emailVerifiedAt: true,
      institution: { select: { locale: true } },
    },
  });

const requestPasswordReset = async ({ email }) => {
  const user = await recipient(email);

  if (user?.isActive)
    await prisma.$transaction(async (tx) => {
      const token = await tokens.issue(tx, {
        userId: user.id,
        purpose: "password_reset",
      });

      await outbox.publish(tx, "password_reset_requested", {
        userId: user.id,
        email: user.email,
        name: user.name,
        token,
        locale: localeOf(user),
        expiresInMinutes: tokens.TTL_MINUTES.password_reset,
      });
    });

  return { requested: true };
};

const resetPassword = async ({ token, password }) => {
  const hashed = await bcrypt.hash(password, 12);

  return prisma.$transaction(async (tx) => {
    const user = await tokens.consume(tx, { token, purpose: "password_reset" });

    await tx.user.update({
      where: { id: user.id },
      data: { password: hashed, emailVerifiedAt: new Date() },
    });

    return { email: user.email };
  });
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true },
  });

  if (!user)
    throw new UnauthorizedError(
      ERROR_CODES.AUTH_TOKEN_INVALID,
      "Token inválido o expirado",
    );

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid)
    throw new BadRequestError(
      ERROR_CODES.PASSWORD_INCORRECT,
      "La contraseña actual no es correcta",
    );

  if (await bcrypt.compare(newPassword, user.password))
    throw new BadRequestError(
      ERROR_CODES.PASSWORD_SAME_AS_CURRENT,
      "La contraseña nueva tiene que ser distinta de la actual",
    );

  await prisma.user.update({
    where: { id: userId },
    data: { password: await bcrypt.hash(newPassword, 12) },
  });

  return { changed: true };
};

const sendVerification = async (client, user) => {
  const token = await tokens.issue(client, {
    userId: user.id,
    purpose: "email_verification",
  });

  await outbox.publish(client, "email_verification_requested", {
    userId: user.id,
    email: user.email,
    name: user.name,
    token,
    locale: localeOf(user),
  });
};

const requestEmailVerification = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      locale: true,
      emailVerifiedAt: true,
      institution: { select: { locale: true } },
    },
  });

  if (user.emailVerifiedAt)
    throw new ConflictError(
      ERROR_CODES.EMAIL_ALREADY_VERIFIED,
      "Este correo ya está verificado",
    );

  await prisma.$transaction((tx) => sendVerification(tx, user));

  return { sent: true };
};

const verifyEmail = async ({ token }) =>
  prisma.$transaction(async (tx) => {
    const user = await tokens.consume(tx, {
      token,
      purpose: "email_verification",
    });

    await tx.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    });

    return { email: user.email };
  });

module.exports = {
  requestPasswordReset,
  resetPassword,
  changePassword,
  requestEmailVerification,
  verifyEmail,
  sendVerification,
};
