const service = require("./wallet.service");
const response = require("../../utils/apiResponse");
const asyncHandler = require("../../shared/http/asyncHandler");

const getMyWallet = asyncHandler(async (req, res) => {
  const result = await service.getMyWallet(req.user.id);
  return response.ok(res, result);
});

const getTransactions = asyncHandler(async (req, res) => {
  const result = await service.getTransactions(req.user.id, req.validatedQuery);
  return response.ok(res, result);
});

const recharge = asyncHandler(async (req, res) => {
  const result = await service.recharge(req.body);
  return response.ok(res, result, "Recarga exitosa");
});

const addSubsidy = asyncHandler(async (req, res) => {
  const result = await service.addSubsidy(req.body, req.tenant);
  return response.ok(res, result, "Subsidio aplicado");
});

module.exports = { getMyWallet, getTransactions, recharge, addSubsidy };
