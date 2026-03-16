const service = require("./withdrawal.service");
const response = require("../../utils/apiResponse");

const getAll = async (req, res) => {
  try {
    const result = await service.getAll(req.user);
    return response.ok(res, result);
  } catch (err) {
    return response.error(res, err.message);
  }
};

const create = async (req, res) => {
  try {
    const result = await service.create(req.user.id, req.body);
    return response.created(res, result, "Solicitud de retiro creada");
  } catch (err) {
    return response.error(res, err.message);
  }
};

const approve = async (req, res) => {
  try {
    const result = await service.approve(req.params.id);
    return response.ok(res, result, "Retiro aprobado");
  } catch (err) {
    return response.error(res, err.message);
  }
};

const reject = async (req, res) => {
  try {
    const result = await service.reject(req.params.id, req.body.notes);
    return response.ok(res, result, "Retiro rechazado");
  } catch (err) {
    return response.error(res, err.message);
  }
};

module.exports = { getAll, create, approve, reject };
