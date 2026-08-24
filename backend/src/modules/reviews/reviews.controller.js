const service = require("./reviews.service");
const response = require("../../utils/apiResponse");
const asyncHandler = require("../../shared/http/asyncHandler");

const getTutorReviews = asyncHandler(async (req, res) => {
  const result = await service.getTutorReviews(
    req.tenant,
    req.params.tutorId,
    req.validatedQuery,
  );
  return response.ok(res, result);
});

const create = asyncHandler(async (req, res) => {
  const result = await service.create(req.user.id, req.body);
  return response.created(res, result, "Reseña creada");
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  return response.ok(res, null, "Reseña eliminada");
});

module.exports = { getTutorReviews, create, remove };
