const prisma = require("./prisma");
const env = require("./env");
const { NotFoundError } = require("../shared/errors/AppError");
const ERROR_CODES = require("../shared/errors/codes");

const PLATFORM_EMAIL = "platform@macaw.app";

const COMMISSION_RATE = env.PLATFORM_COMMISSION_RATE;

const commissionRateFor = async (institutionId) => {
  if (!institutionId) return COMMISSION_RATE;

  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    select: { commissionRate: true },
  });

  return institution?.commissionRate ?? COMMISSION_RATE;
};

const getPlatformUser = async (client = prisma) => {
  const platform = await client.user.findUnique({
    where: { email: PLATFORM_EMAIL },
    select: { id: true, wallet: { select: { id: true, currency: true } } },
  });

  if (!platform?.wallet)
    throw new NotFoundError(
      ERROR_CODES.PLATFORM_WALLET_NOT_FOUND,
      "Wallet de plataforma no encontrada",
    );

  return platform;
};

const getPlatformWallet = async () => (await getPlatformUser()).wallet;

module.exports = {
  getPlatformUser,
  getPlatformWallet,
  commissionRateFor,
  COMMISSION_RATE,
  PLATFORM_EMAIL,
};
