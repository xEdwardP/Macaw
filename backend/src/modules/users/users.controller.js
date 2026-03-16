const service = require("./users.service");
const response = require("../../utils/apiResponse");

const getAll = async (req, res) => {
  try {
    const result = await service.getAll(req.query);
    return response.ok(res, result);
  } catch (err) {
    return response.error(res, err.message);
  }
};

const toggleActive = async (req, res) => {
  try {
    const result = await service.toggleActive(req.params.id);
    return response.ok(res, result, "Usuario actualizado");
  } catch (err) {
    return response.error(res, err.message);
  }
};

module.exports = { getAll, toggleActive };
