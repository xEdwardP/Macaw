const service = require("./sessions.service");
const response = require("../../utils/apiResponse");

const getAll = async (req, res) => {
  try {
    const result = await service.getAll(req.user);
    return response.ok(res, result);
  } catch (err) {
    return response.error(res, err.message);
  }
};

const getOne = async (req, res) => {
  try {
    const result = await service.getOne(req.params.id, req.user);
    return response.ok(res, result);
  } catch (err) {
    return response.error(res, err.message);
  }
};

const create = async (req, res) => {
  try {
    const result = await service.create(req.user.id, req.body);
    return response.created(res, result, "Sesión creada");
  } catch (err) {
    return response.error(res, err.message);
  }
};

const confirm = async (req, res) => {
  try {
    const result = await service.confirm(req.params.id, req.user.id);
    return response.ok(res, result, "Sesión confirmada");
  } catch (err) {
    return response.error(res, err.message);
  }
};

const cancel = async (req, res) => {
  try {
    const result = await service.cancel(req.params.id, req.user);
    return response.ok(res, result, "Sesión cancelada");
  } catch (err) {
    return response.error(res, err.message);
  }
};

const complete = async (req, res) => {
  try {
    const result = await service.complete(req.params.id, req.user.id);
    return response.ok(res, result, "Sesión completada");
  } catch (err) {
    return response.error(res, err.message);
  }
};

const studentConfirm = async (req, res) => {
  try {
    const result = await service.studentConfirm(req.params.id, req.user.id);
    return response.ok(res, result, "Sesión confirmada");
  } catch (err) {
    return response.error(res, err.message);
  }
};

const dispute = async (req, res) => {
  try {
    const result = await service.dispute(
      req.params.id,
      req.user.id,
      req.body.reason,
    );
    return response.ok(res, result, "Disputa abierta");
  } catch (err) {
    return response.error(res, err.message);
  }
};

const resolve = async (req, res) => {
  try {
    const result = await service.resolve(req.params.id, req.body.favorOf);
    return response.ok(res, result, "Disputa resuelta");
  } catch (err) {
    return response.error(res, err.message);
  }
};

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
};
