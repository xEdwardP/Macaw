const service = require("./ai.service");
const response = require("../../utils/apiResponse");

const getRecommendations = async (req, res) => {
  try {
    const result = await service.getRecommendations(req.user.id);
    return response.ok(res, result);
  } catch (err) {
    const status = err.message.includes("IA") ? 503 : 400;
    return response.error(res, err.message, status);
  }
};

const getReviewSummary = async (req, res) => {
  try {
    const result = await service.getReviewSummary(req.params.tutorId);
    return response.ok(res, result);
  } catch (err) {
    const status = err.message.includes("IA") ? 503 : 400;
    return response.error(res, err.message, status);
  }
};

module.exports = { getRecommendations, getReviewSummary };
