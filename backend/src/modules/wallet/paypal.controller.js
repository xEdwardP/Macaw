const service = require("./paypal.service");
const response = require("../../utils/apiResponse");
const asyncHandler = require("../../shared/http/asyncHandler");

const createOrder = asyncHandler(async (req, res) => {
  const result = await service.createWalletOrder(req.user, req.body.amount);
  return response.ok(res, result, "Orden creada");
});

const captureOrder = asyncHandler(async (req, res) => {
  const result = await service.captureOrder(req.user.id, req.body.orderId);
  return response.ok(res, result, "Pago completado");
});

const webhook = asyncHandler(async (req, res) => {
  const result = await service.handleWebhook(req.body);
  return response.ok(res, result, "Webhook recibido");
});

module.exports = { createOrder, captureOrder, webhook };
