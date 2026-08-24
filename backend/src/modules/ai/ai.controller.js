const service = require("./ai.service");
const response = require("../../utils/apiResponse");
const asyncHandler = require("../../shared/http/asyncHandler");

const getRecommendations = asyncHandler(async (req, res) => {
  const result = await service.getRecommendations(req.tenant);
  return response.ok(res, result);
});

const getReviewSummary = asyncHandler(async (req, res) => {
  const result = await service.getReviewSummary(req.params.tutorId, req.tenant);
  return response.ok(res, result);
});

module.exports = { getRecommendations, getReviewSummary };
