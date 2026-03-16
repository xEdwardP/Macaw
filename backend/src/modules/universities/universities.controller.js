const service = require("./universities.service");
const response = require("../../utils/apiResponse");

const getSubjects = async (req, res) => {
  try {
    const result = await service.getSubjects(req.query);
    return response.ok(res, result);
  } catch (err) {
    return response.error(res, err.message);
  }
};

const createSubject = async (req, res) => {
  try {
    const result = await service.createSubject(req.body);
    return response.created(res, result, "Materia creada");
  } catch (err) {
    return response.error(res, err.message);
  }
};

const getAnalytics = async (req, res) => {
  try {
    const result = await service.getAnalytics(req.user);
    return response.ok(res, result);
  } catch (err) {
    return response.error(res, err.message);
  }
};

const getStudents = async (req, res) => {
  try {
    const result = await service.getStudents(req.user, req.query);
    return response.ok(res, result);
  } catch (err) {
    return response.error(res, err.message);
  }
};

const getSubsidies = async (req, res) => {
  try {
    const result = await service.getSubsidies(req.user);
    return response.ok(res, result);
  } catch (err) {
    return response.error(res, err.message);
  }
};

const getFaculties = async (req, res) => {
  try {
    const result = await service.getFaculties(req.query);
    return response.ok(res, result);
  } catch (err) {
    return response.error(res, err.message);
  }
};

const getSubjectsByFaculty = async (req, res) => {
  try {
    const result = await service.getSubjectsByFaculty(req.params.id);
    return response.ok(res, result);
  } catch (err) {
    return response.error(res, err.message);
  }
};

const getPlatformEarnings = async (req, res) => {
  try {
    const result = await service.getPlatformEarnings();
    return response.ok(res, result);
  } catch (err) {
    return response.error(res, err.message);
  }
};

const rechargeUniversity = async (req, res) => {
  try {
    const result = await service.rechargeUniversity(req.body);
    return response.ok(res, result, "Balance universitario recargado");
  } catch (err) {
    return response.error(res, err.message);
  }
};

const getList = async (req, res) => {
  try {
    const result = await service.getList();
    return response.ok(res, result);
  } catch (err) {
    return response.error(res, err.message);
  }
};

const createUniversityOrder = async (req, res) => {
  try {
    const result = await service.createUniversityOrder(
      req.user.universityId,
      req.body.amount,
    );
    return response.ok(res, result, "Orden creada");
  } catch (err) {
    return response.error(res, err.message);
  }
};

const captureUniversityOrder = async (req, res) => {
  try {
    const result = await service.captureUniversityOrder(
      req.user.universityId,
      req.body.orderId,
    );
    return response.ok(res, result, "Pago completado");
  } catch (err) {
    return response.error(res, err.message);
  }
};
const createFaculty = async (req, res) => {
  try {
    const result = await service.createFaculty(req.body);
    return response.created(res, result, "Facultad creada");
  } catch (err) {
    return response.error(res, err.message);
  }
};

const updateFaculty = async (req, res) => {
  try {
    const result = await service.updateFaculty(req.params.id, req.body);
    return response.ok(res, result, "Facultad actualizada");
  } catch (err) {
    return response.error(res, err.message);
  }
};

const deleteFaculty = async (req, res) => {
  try {
    await service.deleteFaculty(req.params.id);
    return response.ok(res, null, "Facultad eliminada");
  } catch (err) {
    return response.error(res, err.message);
  }
};

const assignSubjectToFaculty = async (req, res) => {
  try {
    const result = await service.assignSubjectToFaculty(req.params.id, req.body.subjectId);
    return response.created(res, result, "Materia asignada a la facultad");
  } catch (err) {
    return response.error(res, err.message);
  }
};

const removeSubjectFromFaculty = async (req, res) => {
  try {
    await service.removeSubjectFromFaculty(req.params.id, req.params.subjectId);
    return response.ok(res, null, "Materia removida de la facultad");
  } catch (err) {
    return response.error(res, err.message);
  }
};



module.exports = {
  getSubjects,
  getFaculties,
  getSubjectsByFaculty,
  createSubject,
  getAnalytics,
  getStudents,
  getSubsidies,
  getPlatformEarnings,
  rechargeUniversity,
  getList,
  createUniversityOrder,
  captureUniversityOrder,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  assignSubjectToFaculty,
  removeSubjectFromFaculty,
};
