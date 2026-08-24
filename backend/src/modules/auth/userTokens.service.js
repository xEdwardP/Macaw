const crypto = require("crypto");
const prisma = require("../../config/prisma");
const { randomToken } = require("../../utils/token");
const { BadRequestError } = require("../../shared/errors/AppError");
const ERROR_CODES = require("../../shared/errors/codes");

const TTL_MINUTES = {
  password_reset: 60,
  email_verification: 60 * 24 * 3,
};

const hash = (token) => crypto.createHash("sha256").update(token).digest("hex");

const issue = async (client, { userId, purpose }) => {
  const token = randomToken(32);

  await client.userToken.updateMany({
    where: { userId, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });

  await client.userToken.create({
    data: {
      userId,
      purpose,
      tokenHash: hash(token),
      expiresAt: new Date(Date.now() + TTL_MINUTES[purpose] * 60 * 1000),
    },
  });

  return token;
};

const consume = async (client, { token, purpose }) => {
  const record = await client.userToken.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  if (!record || record.purpose !== purpose || record.usedAt)
    throw new BadRequestError(
      ERROR_CODES.TOKEN_INVALID,
      "Este enlace no es válido o ya se usó",
    );

  if (record.expiresAt < new Date())
    throw new BadRequestError(
      ERROR_CODES.TOKEN_EXPIRED,
      "Este enlace caducó. Pide uno nuevo.",
    );

  await client.userToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return record.user;
};

const purgeExpired = async () =>
  prisma.userToken.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
  });

module.exports = { issue, consume, purgeExpired, TTL_MINUTES };
