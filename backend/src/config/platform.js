const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getPlatformWallet = async () => {
  const platform = await prisma.user.findUnique({
    where: { email: "platform@macaw.app" },
    include: { wallet: true },
  });
  if (!platform?.wallet) throw new Error("Platform wallet not found");
  return platform.wallet;
};

module.exports = { getPlatformWallet };
