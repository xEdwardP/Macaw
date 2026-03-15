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

module.exports = {
  getSubjects,
  getFaculties,
  getSubjectsByFaculty,
  createSubject,
  getAnalytics,
  getStudents,
  getSubsidies,
  getPlatformEarnings,
};
