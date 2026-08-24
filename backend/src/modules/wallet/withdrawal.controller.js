const service = require("./withdrawal.service");
const response = require("../../utils/apiResponse");
const asyncHandler = require("../../shared/http/asyncHandler");

const getAll = asyncHandler(async (req, res) => {
  const result = await service.getAll(req.user);
  return response.ok(res, result);
});

const create = asyncHandler(async (req, res) => {
  const result = await service.create(req.user.id, req.body);
  return response.created(res, result, "Solicitud de retiro creada");
});

const approve = asyncHandler(async (req, res) => {
  const result = await service.approve(req.params.id);
  return response.ok(res, result, "Retiro aprobado");
});

const reject = asyncHandler(async (req, res) => {
  const result = await service.reject(req.params.id, req.body.notes);
  return response.ok(res, result, "Retiro rechazado");
});

module.exports = { getAll, create, approve, reject };
