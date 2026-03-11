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

module.exports = { getSubjects, createSubject };
