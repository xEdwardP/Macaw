const service = require("./sessions.service");
const response = require("../../utils/apiResponse");
const asyncHandler = require("../../shared/http/asyncHandler");

const getAll = asyncHandler(async (req, res) => {
  const result = await service.getAll(req.user);
  return response.ok(res, result);
});

const getOne = asyncHandler(async (req, res) => {
  const result = await service.getOne(req.params.id, req.user);
  return response.ok(res, result);
});

const create = asyncHandler(async (req, res) => {
  const result = await service.create(req.tenant, req.body);
  return response.created(res, result, "Sesión creada");
});

const confirm = asyncHandler(async (req, res) => {
  const result = await service.confirm(req.params.id, req.user.id);
  return response.ok(res, result, "Sesión confirmada");
});

const cancel = asyncHandler(async (req, res) => {
  const result = await service.cancel(req.params.id, req.user);
  return response.ok(res, result, "Sesión cancelada");
});

const complete = asyncHandler(async (req, res) => {
  const result = await service.complete(req.params.id, req.user.id);
  return response.ok(res, result, "Sesión completada");
});

const studentConfirm = asyncHandler(async (req, res) => {
  const result = await service.studentConfirm(req.params.id, req.user.id);
  return response.ok(res, result, "Sesión confirmada");
});

const dispute = asyncHandler(async (req, res) => {
  const result = await service.dispute(
    req.params.id,
    req.user.id,
    req.body.reason,
  );
  return response.ok(res, result, "Disputa abierta");
});

const resolve = asyncHandler(async (req, res) => {
  const result = await service.resolve(req.params.id, req.body.favorOf);
  return response.ok(res, result, "Disputa resuelta");
});

const getPaginated = asyncHandler(async (req, res) => {
  const result = await service.getPaginated(req.user, req.validatedQuery);
  return response.ok(res, result);
});

module.exports = {
  getAll,
  getOne,
  create,
  confirm,
  cancel,
  complete,
  studentConfirm,
  dispute,
  resolve,
  getPaginated,
};
