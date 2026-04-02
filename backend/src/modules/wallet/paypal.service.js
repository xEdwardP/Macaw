const paypal = require("../../config/paypal");
const prisma = require("../../config/prisma");

const VALID_AMOUNTS = [5, 10, 20, 50, 100];

const createOrder = async (userId, amount) => {
  if (!VALID_AMOUNTS.includes(parseFloat(amount)))
    throw new Error("Monto no válido");

  const order = await paypal.createOrder(parseFloat(amount));

  return {
    orderId: order.id,
    status: order.status,
    amount,
  };
};

const captureOrder = async (userId, orderId) => {
  if (!orderId) throw new Error("Order ID requerido");

  const capture = await paypal.captureOrder(orderId);

  if (capture.status !== "COMPLETED")
    throw new Error("El pago no fue completado");

  const capturedAmount = parseFloat(
    capture.purchase_units[0].payments.captures[0].amount.value,
  );

  if (!capturedAmount || capturedAmount <= 0)
    throw new Error("Monto capturado inválido");

  const existingTransaction = await prisma.transaction.findFirst({
    where: { description: { contains: orderId } },
  });
  if (existingTransaction) throw new Error("Esta orden ya fue procesada");

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new Error("Wallet no encontrada");

  const updated = await prisma.$transaction(async (tx) => {
    const updatedWallet = await tx.wallet.update({
      where: { userId },
      data: { balance: { increment: capturedAmount } },
    });

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: "recharge",
        amount: capturedAmount,
        description: `Recarga PayPal - Order ID: ${orderId}`,
      },
    });

    return updatedWallet;
  });

  return {
    balance: updated.balance,
    amount: capturedAmount,
    orderId,
  };
};

module.exports = { createOrder, captureOrder };
