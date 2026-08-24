const admin = require("./admin.service");
const domains = require("./domains.service");
const invitations = require("./invitations.service");
const imports = require("./imports.service");
const subscriptions = require("./subscriptions.service");
const exchangeRates = require("./exchangeRates.service");
const reports = require("./reports.service");
const response = require("../../utils/apiResponse");
const asyncHandler = require("../../shared/http/asyncHandler");

const listInstitutions = asyncHandler(async (req, res) => {
  const result = await admin.list(req.validatedQuery);
  return response.ok(res, result);
});

const getInstitution = asyncHandler(async (req, res) => {
  const result = await admin.getById(req.params.id);
  return response.ok(res, result);
});

const createInstitution = asyncHandler(async (req, res) => {
  const result = await admin.create(req.tenant, req.body);
  return response.created(res, result, "Institución creada");
});

const updateInstitution = asyncHandler(async (req, res) => {
  const result = await admin.update(req.tenant, req.params.id, req.body);
  return response.ok(res, result, "Institución actualizada");
});

const updateMine = asyncHandler(async (req, res) => {
  const result = await admin.updateMine(req.tenant, req.body);
  return response.ok(res, result, "Configuración actualizada");
});

const changeStatus = asyncHandler(async (req, res) => {
  const result = await admin.changeStatus(
    req.tenant,
    req.params.id,
    req.body.status,
    req.body.reason,
  );
  return response.ok(res, result, "Estado actualizado");
});

const deleteInstitution = asyncHandler(async (req, res) => {
  await admin.remove(req.tenant, req.params.id);
  return response.ok(res, null, "Institución eliminada");
});

const getTemplates = asyncHandler(async (req, res) => {
  const result = await admin.templates(req.tenant, req.validatedQuery);
  return response.ok(res, result);
});

const applyTemplate = asyncHandler(async (req, res) => {
  const result = await admin.applyTemplate(
    req.tenant,
    req.params.code,
    req.body.institutionId,
  );
  return response.ok(res, result, "Plantilla aplicada");
});

const getAuditLogs = asyncHandler(async (req, res) => {
  const result = await admin.auditLogs(req.tenant, req.validatedQuery);
  return response.ok(res, result);
});

const listDomains = asyncHandler(async (req, res) => {
  const result = await domains.list(
    req.tenant,
    req.validatedQuery?.institutionId,
  );
  return response.ok(res, result);
});

const addDomain = asyncHandler(async (req, res) => {
  const result = await domains.add(req.tenant, req.body);
  return response.created(res, result, "Dominio añadido");
});

const startDomainVerification = asyncHandler(async (req, res) => {
  const result = await domains.startVerification(
    req.tenant,
    req.params.id,
    req.body.method,
  );
  return response.ok(res, result, "Verificación iniciada");
});

const verifyDomain = asyncHandler(async (req, res) => {
  const result = await domains.verify(req.tenant, req.params.id, req.body);
  return response.ok(res, result, "Dominio verificado");
});

const setPrimaryDomain = asyncHandler(async (req, res) => {
  const result = await domains.setPrimary(req.tenant, req.params.id);
  return response.ok(res, result, "Dominio principal actualizado");
});

const removeDomain = asyncHandler(async (req, res) => {
  await domains.remove(req.tenant, req.params.id);
  return response.ok(res, null, "Dominio eliminado");
});

const createInvitation = asyncHandler(async (req, res) => {
  const result = await invitations.create(req.tenant, req.body);
  return response.created(res, result, "Invitación enviada");
});

const createMember = asyncHandler(async (req, res) => {
  const result = await invitations.createMember(req.tenant, req.body);
  return response.created(res, result, "Cuenta creada");
});

const listInvitations = asyncHandler(async (req, res) => {
  const result = await invitations.list(req.tenant, req.validatedQuery);
  return response.ok(res, result);
});

const revokeInvitation = asyncHandler(async (req, res) => {
  const result = await invitations.revoke(req.tenant, req.params.id);
  return response.ok(res, result, "Invitación revocada");
});

const resendInvitation = asyncHandler(async (req, res) => {
  const result = await invitations.resend(req.tenant, req.params.id);
  return response.ok(res, result, "Invitación reenviada");
});

const describeInvitation = asyncHandler(async (req, res) => {
  const result = await invitations.describe(req.params.token);
  return response.ok(res, result);
});

const acceptInvitation = asyncHandler(async (req, res) => {
  const result = await invitations.accept(req.body);
  return response.ok(res, result, "Invitación aceptada");
});

const importStudents = asyncHandler(async (req, res) => {
  const result = await imports.importStudents(
    req.tenant,
    req.body,
    req.validatedQuery,
  );
  return response.ok(
    res,
    result,
    result.dryRun ? "Vista previa de la importación" : "Importación completada",
  );
});

const importSubjects = asyncHandler(async (req, res) => {
  const result = await imports.importSubjects(
    req.tenant,
    req.body,
    req.validatedQuery,
  );
  return response.ok(
    res,
    result,
    result.dryRun ? "Vista previa de la importación" : "Importación completada",
  );
});

const listPlans = asyncHandler(async (req, res) => {
  const result = await subscriptions.listPlans({ includeInactive: true });
  return response.ok(res, result);
});

const createPlan = asyncHandler(async (req, res) => {
  const result = await subscriptions.createPlan(req.tenant, req.body);
  return response.created(res, result, "Plan creado");
});

const updatePlan = asyncHandler(async (req, res) => {
  const result = await subscriptions.updatePlan(
    req.tenant,
    req.params.id,
    req.body,
  );
  return response.ok(res, result, "Plan actualizado");
});

const deletePlan = asyncHandler(async (req, res) => {
  await subscriptions.deletePlan(req.tenant, req.params.id);
  return response.ok(res, null, "Plan eliminado");
});

const getUsage = asyncHandler(async (req, res) => {
  const result = await subscriptions.usage(
    req.tenant,
    req.validatedQuery?.institutionId,
  );
  return response.ok(res, result);
});

const assignPlan = asyncHandler(async (req, res) => {
  const { institutionId, ...data } = req.body;
  const result = await subscriptions.assignPlan(req.tenant, institutionId, data);
  return response.ok(res, result, "Plan asignado");
});

const cancelSubscription = asyncHandler(async (req, res) => {
  const result = await subscriptions.cancel(
    req.tenant,
    req.validatedQuery?.institutionId,
  );
  return response.ok(res, result, "Suscripción cancelada");
});

const listExchangeRates = asyncHandler(async (req, res) => {
  const result = await exchangeRates.list(req.validatedQuery);
  return response.ok(res, result);
});

const createExchangeRate = asyncHandler(async (req, res) => {
  const result = await exchangeRates.create(req.tenant, req.body);
  return response.created(res, result, "Tipo de cambio registrado");
});

const uploadLogo = asyncHandler(async (req, res) => {
  const result = await admin.setLogo(req.tenant, req.file);
  return response.ok(res, result, "Logotipo actualizado");
});

const downloadReport = asyncHandler(async (req, res) => {
  const { csv, filename } = await reports.build(
    req.tenant,
    req.params.report,
    req.validatedQuery,
  );

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  return res.send(csv);
});

module.exports = {
  listInstitutions,
  getInstitution,
  createInstitution,
  updateInstitution,
  updateMine,
  uploadLogo,
  downloadReport,
  changeStatus,
  deleteInstitution,
  getTemplates,
  applyTemplate,
  getAuditLogs,
  listDomains,
  addDomain,
  startDomainVerification,
  verifyDomain,
  setPrimaryDomain,
  removeDomain,
  createInvitation,
  createMember,
  listInvitations,
  revokeInvitation,
  resendInvitation,
  describeInvitation,
  acceptInvitation,
  importStudents,
  importSubjects,
  listPlans,
  createPlan,
  updatePlan,
  deletePlan,
  getUsage,
  assignPlan,
  cancelSubscription,
  listExchangeRates,
  createExchangeRate,
};
