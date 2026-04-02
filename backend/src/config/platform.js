const prisma = require("./prisma");

let platformWalletCache = null;

const getPlatformWallet = async () => {
  if (platformWalletCache) return platformWalletCache;

  const platform = await prisma.user.findUnique({
    where: { email: "platform@macaw.app" },
    select: { id: true },
  });
  if (!platform) throw new Error("Platform wallet not found");

  const wallet = await prisma.wallet.findUnique({
    where: { userId: platform.id },
  });
  if (!wallet) throw new Error("Platform wallet not found");

  platformWalletCache = wallet;
  return platformWalletCache;
};

module.exports = { getPlatformWallet };
