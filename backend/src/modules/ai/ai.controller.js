const service = require("./ai.service");
const response = require("../../utils/apiResponse");

const getRecommendations = async (req, res) => {
  try {
    const result = await service.getRecommendations(req.user.id);
    return response.ok(res, result);
  } catch (err) {
    return response.error(res, err.message);
  }
};

const getReviewSummary = async (req, res) => {
  try {
    const result = await service.getReviewSummary(req.params.tutorId);
    return response.ok(res, result);
  } catch (err) {
    return response.error(res, err.message);
  }
};

module.exports = { getRecommendations, getReviewSummary };
