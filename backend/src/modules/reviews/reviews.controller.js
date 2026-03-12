const service = require("./reviews.service");
const response = require("../../utils/apiResponse");

const getTutorReviews = async (req, res) => {
  try {
    const result = await service.getTutorReviews(req.params.tutorId, req.query);
    return response.ok(res, result);
  } catch (err) {
    return response.error(res, err.message);
  }
};

const create = async (req, res) => {
  try {
    const result = await service.create(req.user.id, req.body);
    return response.created(res, result, "Reseña creada");
  } catch (err) {
    return response.error(res, err.message);
  }
};

const remove = async (req, res) => {
  try {
    await service.remove(req.params.id);
    return response.ok(res, null, "Reseña eliminada");
  } catch (err) {
    return response.error(res, err.message);
  }
};

module.exports = { getTutorReviews, create, remove };
