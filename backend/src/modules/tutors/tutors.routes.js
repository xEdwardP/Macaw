const router = require("express").Router();
const {
  authenticate,
  authorize,
} = require("../../middlewares/auth.middleware");
const { tenantContext } = require("../../middlewares/tenant.middleware");
const validate = require("../../middlewares/validate.middleware");
const {
  listSchema,
  byIdSchema,
  bookedSlotsSchema,
  updateProfileSchema,
  addSubjectSchema,
  removeSubjectSchema,
  availabilitySchema,
  verificationListSchema,
  reviewMembershipSchema,
  inviteTutorSchema,
  requestMembershipSchema,
  respondMembershipSchema,
} = require("./tutors.schema");
const ctrl = require("./tutors.controller");

const asCoordinator = [
  authenticate,
  authorize("institution_admin", "platform_admin"),
  tenantContext,
];

router.get(
  "/verification",
  ...asCoordinator,
  validate(verificationListSchema),
  ctrl.listForVerification,
);
router.post(
  "/verification/invite",
  ...asCoordinator,
  validate(inviteTutorSchema),
  ctrl.inviteTutor,
);
router.patch(
  "/verification/:id",
  ...asCoordinator,
  validate(reviewMembershipSchema),
  ctrl.reviewMembership,
);

router.get(
  "/memberships",
  authenticate,
  authorize("tutor"),
  ctrl.listMyMemberships,
);
router.get(
  "/memberships/joinable",
  authenticate,
  authorize("tutor"),
  ctrl.listJoinable,
);
router.post(
  "/memberships",
  authenticate,
  authorize("tutor"),
  validate(requestMembershipSchema),
  ctrl.requestMembership,
);
router.post(
  "/memberships/:id/respond",
  authenticate,
  authorize("tutor"),
  validate(respondMembershipSchema),
  ctrl.respondToMembership,
);

router.get("/", authenticate, tenantContext, validate(listSchema), ctrl.getAll);
router.get("/:id", authenticate, tenantContext, validate(byIdSchema), ctrl.getOne);
router.get(
  "/:id/availability",
  authenticate,
  tenantContext,
  validate(byIdSchema),
  ctrl.getAvailability,
);
router.get(
  "/:id/booked-slots",
  authenticate,
  tenantContext,
  validate(bookedSlotsSchema),
  ctrl.getBookedSlots,
);
router.put(
  "/profile",
  authenticate,
  authorize("tutor"),
  validate(updateProfileSchema),
  ctrl.updateProfile,
);
router.post(
  "/subjects",
  authenticate,
  authorize("tutor"),
  tenantContext,
  validate(addSubjectSchema),
  ctrl.addSubject,
);
router.delete(
  "/subjects/:subjectId",
  authenticate,
  authorize("tutor"),
  validate(removeSubjectSchema),
  ctrl.removeSubject,
);
router.post(
  "/availability",
  authenticate,
  authorize("tutor"),
  validate(availabilitySchema),
  ctrl.setAvailability,
);

module.exports = router;
