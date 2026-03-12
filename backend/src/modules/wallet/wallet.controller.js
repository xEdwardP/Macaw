const service = require("./wallet.service");
const response = require("../../utils/apiResponse");

const getMyWallet = async (req, res) => {
  try {
    const result = await service.getMyWallet(req.user.id);
    return response.ok(res, result);
  } catch (err) {
    return response.error(res, err.message);
  }
};

const getTransactions = async (req, res) => {
  try {
    const result = await service.getTransactions(req.user.id, req.query);
    return response.ok(res, result);
  } catch (err) {
    return response.error(res, err.message);
  }
};

const recharge = async (req, res) => {
  try {
    const result = await service.recharge(req.body);
    return response.ok(res, result, "Recarga exitosa");
  } catch (err) {
    return response.error(res, err.message);
  }
};

const addSubsidy = async (req, res) => {
  try {
    const result = await service.addSubsidy(req.body);
    return response.ok(res, result, "Subsidio aplicado");
  } catch (err) {
    return response.error(res, err.message);
  }
};

module.exports = { getMyWallet, getTransactions, recharge, addSubsidy };
