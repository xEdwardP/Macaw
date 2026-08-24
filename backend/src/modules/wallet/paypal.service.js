const paypal = require("../../config/paypal");
const prisma = require("../../config/prisma");
const env = require("../../config/env");
const sessionMoney = require("../sessions/sessions.money");
const { money, isPositive, equals, toNumber } = require("../../shared/money/money");
const { resolveSettings } = require("../../config/institutionSettings");
const logger = require("../../config/logger");
const {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} = require("../../shared/errors/AppError");
const ERROR_CODES = require("../../shared/errors/codes");

const WALLET_AMOUNTS = [5, 10, 20, 50, 100];
const INSTITUTION_AMOUNTS = [100, 250, 500, 1000, 2000];

const assertAllowedAmount = (amount, allowed) => {
  if (!allowed.includes(toNumber(amount)))
    throw new BadRequestError(
      ERROR_CODES.PAYMENT_INVALID_AMOUNT,
      "Monto no válido",
    );
};

const assertChargeable = (currency) => {
  if (currency !== env.PLATFORM_BASE_CURRENCY)
    throw new BadRequestError(
      ERROR_CODES.PAYMENT_CURRENCY_NOT_SUPPORTED,
      `Los pagos solo se procesan en ${env.PLATFORM_BASE_CURRENCY}`,
    );
};

const createWalletOrder = async (user, amount) => {
  const parsedAmount = money(amount);
  assertAllowedAmount(parsedAmount, WALLET_AMOUNTS);

  if (user.role === "student" && user.institutionId) {
    const institution = await prisma.institution.findUnique({
      where: { id: user.institutionId },
      select: { type: true, settings: true },
    });

    if (!resolveSettings(institution).studentSelfTopUp)
      throw new ForbiddenError(
        ERROR_CODES.WALLET_SELF_TOPUP_DISABLED,
        "Tu saldo proviene de los subsidios de tu institución",
      );
  }

  const wallet = await prisma.wallet.findUnique({
    where: { userId: user.id },
    select: { currency: true },
  });
  if (!wallet)
    throw new NotFoundError(ERROR_CODES.WALLET_NOT_FOUND, "Wallet no encontrada");

  assertChargeable(wallet.currency);

  const order = await paypal.createOrder(toNumber(parsedAmount), wallet.currency);

  await prisma.paymentOrder.create({
    data: {
      providerOrderId: order.id,
      purpose: "wallet_topup",
      userId: user.id,
      amount: parsedAmount,
      currency: wallet.currency,
    },
  });

  return { orderId: order.id, status: order.status, amount: toNumber(parsedAmount) };
};

const createInstitutionOrder = async (institutionId, amount) => {
  const parsedAmount = money(amount);
  assertAllowedAmount(parsedAmount, INSTITUTION_AMOUNTS);

  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    select: { id: true, currencyCode: true },
  });
  if (!institution)
    throw new NotFoundError(
      ERROR_CODES.INSTITUTION_NOT_FOUND,
      "Institución no encontrada",
    );

  assertChargeable(institution.currencyCode);

  const order = await paypal.createOrder(
    toNumber(parsedAmount),
    institution.currencyCode,
  );

  await prisma.paymentOrder.create({
    data: {
      providerOrderId: order.id,
      purpose: "institution_topup",
      institutionId,
      amount: parsedAmount,
      currency: institution.currencyCode,
    },
  });

  return { orderId: order.id, status: order.status, amount: toNumber(parsedAmount) };
};

const loadOrderForCapture = async (providerOrderId, owner) => {
  const order = await prisma.paymentOrder.findUnique({
    where: { providerOrderId },
  });

  if (!order)
    throw new NotFoundError(
      ERROR_CODES.PAYMENT_ORDER_NOT_FOUND,
      "Orden de pago no encontrada",
    );

  if (order.status === "completed")
    throw new ConflictError(
      ERROR_CODES.PAYMENT_ALREADY_PROCESSED,
      "Esta orden ya fue procesada",
    );

  if (order.status !== "created")
    throw new ConflictError(
      ERROR_CODES.PAYMENT_ALREADY_PROCESSED,
      "Esta orden no se puede capturar",
    );

  const belongsToCaller =
    order.purpose === "wallet_topup"
      ? order.userId === owner.userId
      : order.institutionId === owner.institutionId;

  if (!belongsToCaller)
    throw new ForbiddenError(
      ERROR_CODES.PAYMENT_ORDER_NOT_OWNED,
      "Esta orden pertenece a otra cuenta",
    );

  return order;
};

const capturedMoneyOf = (capture) =>
  capture?.purchase_units?.[0]?.payments?.captures?.[0]?.amount;

const capturedAmountOf = (capture) => money(capturedMoneyOf(capture)?.value || 0);

const settleOrder = async (order, capture) => {
  const capturedAmount = capturedAmountOf(capture);
  const capturedCurrency = capturedMoneyOf(capture)?.currency_code;

  if (!isPositive(capturedAmount))
    throw new BadRequestError(
      ERROR_CODES.PAYMENT_INVALID_AMOUNT,
      "Monto capturado inválido",
    );

  if (capturedCurrency !== order.currency) {
    logger.error(
      {
        providerOrderId: order.providerOrderId,
        expected: order.currency,
        captured: capturedCurrency,
      },
      "PayPal cobró en una moneda distinta a la de la orden",
    );

    throw new ConflictError(
      ERROR_CODES.PAYMENT_CURRENCY_MISMATCH,
      "El cobro se hizo en una moneda distinta a la de la orden",
    );
  }

  if (!equals(capturedAmount, order.amount)) {
    logger.error(
      {
        providerOrderId: order.providerOrderId,
        expected: toNumber(order.amount),
        captured: toNumber(capturedAmount),
      },
      "El monto capturado no coincide con el de la orden",
    );

    throw new ConflictError(
      ERROR_CODES.PAYMENT_AMOUNT_MISMATCH,
      "El monto cobrado no coincide con el de la orden",
    );
  }

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.paymentOrder.updateMany({
      where: { id: order.id, status: "created" },
      data: {
        status: "completed",
        capturedAmount,
        capturedAt: new Date(),
        providerPayload: capture,
      },
    });

    if (claimed.count === 0)
      throw new ConflictError(
        ERROR_CODES.PAYMENT_ALREADY_PROCESSED,
        "Esta orden ya fue procesada",
      );

    if (order.purpose === "wallet_topup") {
      await sessionMoney.rechargeWallet(tx, {
        userId: order.userId,
        amount: capturedAmount,
        currency: order.currency,
        reason: "wallet.paypal_recharge",
        idempotencyKey: `payment:${order.id}`,
        description: `Recarga PayPal - Order ID: ${order.providerOrderId}`,
      });

      return tx.wallet.findUnique({ where: { userId: order.userId } });
    }

    await sessionMoney.fundInstitution(tx, {
      institutionId: order.institutionId,
      amount: capturedAmount,
      currency: order.currency,
      reason: "institution.paypal_recharge",
      idempotencyKey: `payment:${order.id}`,
    });

    return tx.institution.findUnique({ where: { id: order.institutionId } });
  });
};

const captureOrder = async (userId, providerOrderId) => {
  const order = await loadOrderForCapture(providerOrderId, { userId });

  const capture = await paypal.captureOrder(providerOrderId);

  if (capture.status !== "COMPLETED") {
    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: { status: "failed", failureReason: capture.status },
    });
    throw new BadRequestError(
      ERROR_CODES.PAYMENT_NOT_COMPLETED,
      "El pago no fue completado",
    );
  }

  const wallet = await settleOrder(order, capture);

  return {
    balance: toNumber(wallet.balance),
    amount: toNumber(capturedAmountOf(capture)),
    currency: order.currency,
    orderId: providerOrderId,
  };
};

const captureInstitutionOrder = async (institutionId, providerOrderId) => {
  const order = await loadOrderForCapture(providerOrderId, { institutionId });

  const capture = await paypal.captureOrder(providerOrderId);

  if (capture.status !== "COMPLETED") {
    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: { status: "failed", failureReason: capture.status },
    });
    throw new BadRequestError(
      ERROR_CODES.PAYMENT_NOT_COMPLETED,
      "El pago no fue completado",
    );
  }

  const institution = await settleOrder(order, capture);

  return {
    balance: toNumber(institution.balance),
    amount: toNumber(capturedAmountOf(capture)),
    currency: order.currency,
    orderId: providerOrderId,
  };
};

const HANDLED_WEBHOOK_EVENTS = new Set([
  "CHECKOUT.ORDER.APPROVED",
  "PAYMENT.CAPTURE.COMPLETED",
]);

const handleWebhook = async (event) => {
  if (!HANDLED_WEBHOOK_EVENTS.has(event?.event_type))
    return { handled: false, reason: "event_ignored" };

  const providerOrderId =
    event.resource?.supplementary_data?.related_ids?.order_id ||
    event.resource?.id;

  if (!providerOrderId) return { handled: false, reason: "order_id_missing" };

  const order = await prisma.paymentOrder.findUnique({
    where: { providerOrderId },
  });

  if (!order) return { handled: false, reason: "order_unknown" };
  if (order.status !== "created")
    return { handled: false, reason: "order_not_capturable" };

  const capture = await paypal.captureOrder(providerOrderId);
  if (capture.status !== "COMPLETED")
    return { handled: false, reason: "capture_not_completed" };

  await settleOrder(order, capture);

  return { handled: true, providerOrderId };
};

module.exports = {
  createWalletOrder,
  createInstitutionOrder,
  captureOrder,
  captureInstitutionOrder,
  handleWebhook,
  WALLET_AMOUNTS,
  INSTITUTION_AMOUNTS,
};
