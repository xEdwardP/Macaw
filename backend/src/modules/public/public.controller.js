const institutions = require("../institutions/institutions.service");
const response = require("../../utils/apiResponse");
const asyncHandler = require("../../shared/http/asyncHandler");

const listInstitutions = asyncHandler(async (req, res) => {
  const result = await institutions.getPublicInstitutions();
  return response.ok(res, result);
});

const resolveInstitution = asyncHandler(async (req, res) => {
  const result = await institutions.resolveByDomain(
    req.validatedQuery.email || req.validatedQuery.domain,
  );
  return response.ok(res, result);
});

module.exports = { listInstitutions, resolveInstitution };
