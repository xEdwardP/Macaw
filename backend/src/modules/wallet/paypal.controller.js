const service = require("./paypal.service");
const response = require("../../utils/apiResponse");

const createOrder = async (req, res) => {
  try {
    const result = await service.createOrder(req.user.id, req.body.amount);
    return response.ok(res, result, "Orden creada");
  } catch (err) {
    return response.error(res, err.message);
  }
};

const captureOrder = async (req, res) => {
  try {
    const result = await service.captureOrder(req.user.id, req.body.orderId);
    return response.ok(res, result, "Pago completado");
  } catch (err) {
    return response.error(res, err.message);
  }
};

module.exports = { createOrder, captureOrder };
