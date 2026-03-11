const service = require("./tutors.service");
const response = require("../../utils/apiResponse");

const getAll = async (req, res) => {
  try {
    const result = await service.getAll(req.query);
    return response.ok(res, result);
  } catch (err) {
    return response.error(res, err.message);
  }
};

const getOne = async (req, res) => {
  try {
    const result = await service.getOne(req.params.id);
    return response.ok(res, result);
  } catch (err) {
    return response.error(res, err.message);
  }
};

const updateProfile = async (req, res) => {
  try {
    const result = await service.updateProfile(req.user.id, req.body);
    return response.ok(res, result, "Perfil actualizado");
  } catch (err) {
    return response.error(res, err.message);
  }
};

const addSubject = async (req, res) => {
  try {
    const result = await service.addSubject(req.user.id, req.body);
    return response.created(res, result, "Materia agregada");
  } catch (err) {
    return response.error(res, err.message);
  }
};

const removeSubject = async (req, res) => {
  try {
    await service.removeSubject(req.user.id, req.params.subjectId);
    return response.ok(res, null, "Materia eliminada");
  } catch (err) {
    return response.error(res, err.message);
  }
};

module.exports = { getAll, getOne, updateProfile, addSubject, removeSubject };
