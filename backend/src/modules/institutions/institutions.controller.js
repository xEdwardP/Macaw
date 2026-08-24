const service = require("./institutions.service");
const response = require("../../utils/apiResponse");
const asyncHandler = require("../../shared/http/asyncHandler");

const getPublicInstitutions = asyncHandler(async (req, res) => {
  const result = await service.getPublicInstitutions();
  return response.ok(res, result);
});

const getMine = asyncHandler(async (req, res) => {
  const result = await service.getMine(req.tenant);
  return response.ok(res, result);
});

const getCurrencies = asyncHandler(async (req, res) => {
  const result = await service.getCurrencies();
  return response.ok(res, result);
});

const getPlans = asyncHandler(async (req, res) => {
  const result = await service.getPlans();
  return response.ok(res, result);
});

const getUnits = asyncHandler(async (req, res) => {
  const result = await service.getUnits(req.validatedQuery);
  return response.ok(res, result);
});

const getSubjectsByUnit = asyncHandler(async (req, res) => {
  const result = await service.getSubjectsByUnit(
    req.params.id,
    req.validatedQuery,
  );
  return response.ok(res, result);
});

const getSubjects = asyncHandler(async (req, res) => {
  const result = await service.getSubjects(req.tenant, req.validatedQuery);
  return response.ok(res, result);
});

const getAnalytics = asyncHandler(async (req, res) => {
  const result = await service.getAnalytics(req.tenant);
  return response.ok(res, result);
});

const getStudents = asyncHandler(async (req, res) => {
  const result = await service.getStudents(req.tenant, req.validatedQuery);
  return response.ok(res, result);
});

const getSubsidies = asyncHandler(async (req, res) => {
  const result = await service.getSubsidies(req.tenant);
  return response.ok(res, result);
});

const getPlatformEarnings = asyncHandler(async (req, res) => {
  const result = await service.getPlatformEarnings();
  return response.ok(res, result);
});

const rechargeInstitution = asyncHandler(async (req, res) => {
  const result = await service.rechargeInstitution(req.body);
  return response.ok(res, result, "Balance de la institución recargado");
});

const getList = asyncHandler(async (req, res) => {
  const result = await service.getList();
  return response.ok(res, result);
});

const createOrder = asyncHandler(async (req, res) => {
  const result = await service.createOrder(req.tenant, req.body.amount);
  return response.ok(res, result, "Orden creada");
});

const captureOrder = asyncHandler(async (req, res) => {
  const result = await service.captureOrder(req.tenant, req.body.orderId);
  return response.ok(res, result, "Pago completado");
});

const createUnit = asyncHandler(async (req, res) => {
  const result = await service.createUnit(req.tenant, req.body);
  return response.created(res, result, "Unidad académica creada");
});

const updateUnit = asyncHandler(async (req, res) => {
  const result = await service.updateUnit(req.tenant, req.params.id, req.body);
  return response.ok(res, result, "Unidad académica actualizada");
});

const deleteUnit = asyncHandler(async (req, res) => {
  await service.deleteUnit(req.tenant, req.params.id);
  return response.ok(res, null, "Unidad académica eliminada");
});

const createSubject = asyncHandler(async (req, res) => {
  const result = await service.createSubject(req.tenant, req.body);
  return response.created(res, result, "Materia creada");
});

const updateSubject = asyncHandler(async (req, res) => {
  const result = await service.updateSubject(
    req.tenant,
    req.params.id,
    req.body,
  );
  return response.ok(res, result, "Materia actualizada");
});

const deleteSubject = asyncHandler(async (req, res) => {
  await service.deleteSubject(req.tenant, req.params.id);
  return response.ok(res, null, "Materia eliminada");
});

const assignSubjectToUnit = asyncHandler(async (req, res) => {
  const result = await service.assignSubjectToUnit(
    req.tenant,
    req.params.id,
    req.body.subjectId,
  );
  return response.ok(res, result, "Materia asignada");
});

const removeSubjectFromUnit = asyncHandler(async (req, res) => {
  await service.removeSubjectFromUnit(
    req.tenant,
    req.params.id,
    req.params.subjectId,
  );
  return response.ok(res, null, "Materia removida");
});

const getGradeLevels = asyncHandler(async (req, res) => {
  const result = await service.getGradeLevels(req.tenant, req.params.id);
  return response.ok(res, result);
});

const createGradeLevel = asyncHandler(async (req, res) => {
  const result = await service.createGradeLevel(
    req.tenant,
    req.params.id,
    req.body,
  );
  return response.created(res, result, "Grado creado");
});

const updateGradeLevel = asyncHandler(async (req, res) => {
  const result = await service.updateGradeLevel(
    req.tenant,
    req.params.id,
    req.body,
  );
  return response.ok(res, result, "Grado actualizado");
});

const deleteGradeLevel = asyncHandler(async (req, res) => {
  await service.deleteGradeLevel(req.tenant, req.params.id);
  return response.ok(res, null, "Grado eliminado");
});

module.exports = {
  getGradeLevels,
  createGradeLevel,
  updateGradeLevel,
  deleteGradeLevel,
  getPublicInstitutions,
  getMine,
  getCurrencies,
  getPlans,
  getUnits,
  getSubjectsByUnit,
  getSubjects,
  getAnalytics,
  getStudents,
  getSubsidies,
  getPlatformEarnings,
  rechargeInstitution,
  getList,
  createOrder,
  captureOrder,
  createUnit,
  updateUnit,
  deleteUnit,
  createSubject,
  updateSubject,
  deleteSubject,
  assignSubjectToUnit,
  removeSubjectFromUnit,
};
