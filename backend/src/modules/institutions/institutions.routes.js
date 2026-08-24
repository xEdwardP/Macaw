const express = require("express");
const router = express.Router();
const {
  authenticate,
  authorize,
} = require("../../middlewares/auth.middleware");
const { tenantContext } = require("../../middlewares/tenant.middleware");
const validate = require("../../middlewares/validate.middleware");
const { imageUpload } = require("../../config/uploads");
const schemas = require("./institutions.schema");
const adminSchemas = require("./admin.schema");
const ctrl = require("./institutions.controller");
const admin = require("./admin.controller");

const asInstitution = [
  authenticate,
  authorize("institution_admin", "platform_admin"),
  tenantContext,
];

const asPlatform = [authenticate, authorize("platform_admin"), tenantContext];

const asMember = [authenticate, tenantContext];

const csvBody = express.text({ type: "text/csv", limit: "2mb" });

router.get("/public", ctrl.getPublicInstitutions);
router.get("/currencies", ctrl.getCurrencies);
router.get("/units", validate(schemas.unitsQuerySchema), ctrl.getUnits);
router.get(
  "/units/:id/subjects",
  validate(schemas.unitSubjectsSchema),
  ctrl.getSubjectsByUnit,
);

router.get("/me", asMember, ctrl.getMine);
router.patch(
  "/me",
  asInstitution,
  validate(adminSchemas.updateMineSchema),
  admin.updateMine,
);
router.post(
  "/me/logo",
  asInstitution,
  imageUpload.single("image"),
  admin.uploadLogo,
);

router.get(
  "/reports/:report",
  asInstitution,
  validate(adminSchemas.reportSchema),
  admin.downloadReport,
);
router.get("/plans", asMember, ctrl.getPlans);
router.get(
  "/subjects",
  asMember,
  validate(schemas.subjectsQuerySchema),
  ctrl.getSubjects,
);

router.get("/platform-earnings", asPlatform, ctrl.getPlatformEarnings);
router.post(
  "/recharge",
  asPlatform,
  validate(schemas.rechargeSchema),
  ctrl.rechargeInstitution,
);

router.get("/analytics", asInstitution, ctrl.getAnalytics);
router.get(
  "/students",
  asInstitution,
  validate(schemas.studentsQuerySchema),
  ctrl.getStudents,
);
router.get("/subsidies", asInstitution, ctrl.getSubsidies);
router.get(
  "/audit-logs",
  asInstitution,
  validate(adminSchemas.auditQuerySchema),
  admin.getAuditLogs,
);

router.get(
  "/templates",
  asInstitution,
  validate(adminSchemas.templatesQuerySchema),
  admin.getTemplates,
);
router.post(
  "/templates/:code/apply",
  asInstitution,
  validate(adminSchemas.applyTemplateSchema),
  admin.applyTemplate,
);

router.get(
  "/domains",
  asInstitution,
  validate(adminSchemas.institutionQuerySchema),
  admin.listDomains,
);
router.post(
  "/domains",
  asInstitution,
  validate(adminSchemas.addDomainSchema),
  admin.addDomain,
);
router.post(
  "/domains/:id/verification",
  asInstitution,
  validate(adminSchemas.startVerificationSchema),
  admin.startDomainVerification,
);
router.post(
  "/domains/:id/verify",
  asInstitution,
  validate(adminSchemas.verifyDomainSchema),
  admin.verifyDomain,
);
router.post(
  "/domains/:id/primary",
  asInstitution,
  validate({ params: adminSchemas.idParam }),
  admin.setPrimaryDomain,
);
router.delete(
  "/domains/:id",
  asInstitution,
  validate({ params: adminSchemas.idParam }),
  admin.removeDomain,
);

router.get(
  "/invitations",
  asInstitution,
  validate(adminSchemas.listInvitationsSchema),
  admin.listInvitations,
);
router.post(
  "/invitations",
  asInstitution,
  validate(adminSchemas.createInvitationSchema),
  admin.createInvitation,
);
router.post(
  "/members",
  asInstitution,
  validate(adminSchemas.createMemberSchema),
  admin.createMember,
);
router.post(
  "/invitations/:id/resend",
  asInstitution,
  validate({ params: adminSchemas.idParam }),
  admin.resendInvitation,
);
router.delete(
  "/invitations/:id",
  asInstitution,
  validate({ params: adminSchemas.idParam }),
  admin.revokeInvitation,
);

router.post(
  "/imports/students",
  asInstitution,
  csvBody,
  validate(adminSchemas.importSchema),
  admin.importStudents,
);
router.post(
  "/imports/subjects",
  asInstitution,
  csvBody,
  validate(adminSchemas.importSchema),
  admin.importSubjects,
);

router.get(
  "/subscription",
  asInstitution,
  validate(adminSchemas.institutionQuerySchema),
  admin.getUsage,
);
router.post(
  "/subscription",
  asPlatform,
  validate(adminSchemas.assignPlanSchema),
  admin.assignPlan,
);
router.delete(
  "/subscription",
  asPlatform,
  validate(adminSchemas.institutionQuerySchema),
  admin.cancelSubscription,
);

router.get("/admin/plans", asPlatform, admin.listPlans);
router.post(
  "/admin/plans",
  asPlatform,
  validate(adminSchemas.createPlanSchema),
  admin.createPlan,
);
router.put(
  "/admin/plans/:id",
  asPlatform,
  validate(adminSchemas.updatePlanSchema),
  admin.updatePlan,
);
router.delete(
  "/admin/plans/:id",
  asPlatform,
  validate({ params: adminSchemas.idParam }),
  admin.deletePlan,
);

router.get(
  "/exchange-rates",
  asPlatform,
  validate(adminSchemas.listExchangeRatesSchema),
  admin.listExchangeRates,
);
router.post(
  "/exchange-rates",
  asPlatform,
  validate(adminSchemas.exchangeRateSchema),
  admin.createExchangeRate,
);

router.post(
  "/subjects",
  asInstitution,
  validate(schemas.createSubjectSchema),
  ctrl.createSubject,
);
router.put(
  "/subjects/:id",
  asInstitution,
  validate(schemas.updateSubjectSchema),
  ctrl.updateSubject,
);
router.delete(
  "/subjects/:id",
  asInstitution,
  validate({ params: schemas.idParam }),
  ctrl.deleteSubject,
);

router.post(
  "/units",
  asInstitution,
  validate(schemas.createUnitSchema),
  ctrl.createUnit,
);
router.put(
  "/units/:id",
  asInstitution,
  validate(schemas.updateUnitSchema),
  ctrl.updateUnit,
);
router.delete(
  "/units/:id",
  asInstitution,
  validate({ params: schemas.idParam }),
  ctrl.deleteUnit,
);
router.post(
  "/units/:id/subjects",
  asInstitution,
  validate(schemas.assignSubjectSchema),
  ctrl.assignSubjectToUnit,
);
router.delete(
  "/units/:id/subjects/:subjectId",
  asInstitution,
  validate(schemas.removeSubjectSchema),
  ctrl.removeSubjectFromUnit,
);

router.get(
  "/units/:id/grade-levels",
  asInstitution,
  validate({ params: schemas.idParam }),
  ctrl.getGradeLevels,
);
router.post(
  "/units/:id/grade-levels",
  asInstitution,
  validate(adminSchemas.createGradeLevelSchema),
  ctrl.createGradeLevel,
);
router.put(
  "/grade-levels/:id",
  asInstitution,
  validate(adminSchemas.updateGradeLevelSchema),
  ctrl.updateGradeLevel,
);
router.delete(
  "/grade-levels/:id",
  asInstitution,
  validate({ params: adminSchemas.idParam }),
  ctrl.deleteGradeLevel,
);

router.post(
  "/create-order",
  authenticate,
  authorize("institution_admin"),
  tenantContext,
  validate(schemas.createOrderSchema),
  ctrl.createOrder,
);
router.post(
  "/capture-order",
  authenticate,
  authorize("institution_admin"),
  tenantContext,
  validate(schemas.captureOrderSchema),
  ctrl.captureOrder,
);

router.get(
  "/",
  asPlatform,
  validate(adminSchemas.listInstitutionsSchema),
  admin.listInstitutions,
);
router.post(
  "/",
  asPlatform,
  validate(adminSchemas.createInstitutionSchema),
  admin.createInstitution,
);
router.get(
  "/:id",
  asPlatform,
  validate({ params: adminSchemas.idParam }),
  admin.getInstitution,
);
router.put(
  "/:id",
  asPlatform,
  validate(adminSchemas.updateInstitutionSchema),
  admin.updateInstitution,
);
router.patch(
  "/:id/status",
  asPlatform,
  validate(adminSchemas.changeStatusSchema),
  admin.changeStatus,
);
router.delete(
  "/:id",
  asPlatform,
  validate({ params: adminSchemas.idParam }),
  admin.deleteInstitution,
);

module.exports = router;
