const router = require("express").Router();
const {
  authenticate,
  authorize,
} = require("../../middlewares/auth.middleware");
const { tenantContext } = require("../../middlewares/tenant.middleware");
const validate = require("../../middlewares/validate.middleware");
const {
  createSchema,
  listSchema,
  disputeSchema,
  resolveSchema,
  byIdSchema,
} = require("./sessions.schema");
const ctrl = require("./sessions.controller");

router.get("/", authenticate, validate(listSchema), ctrl.getPaginated);
router.get("/:id", authenticate, validate(byIdSchema), ctrl.getOne);
router.post(
  "/",
  authenticate,
  authorize("student"),
  tenantContext,
  validate(createSchema),
  ctrl.create,
);
router.put(
  "/:id/confirm",
  authenticate,
  authorize("tutor"),
  validate(byIdSchema),
  ctrl.confirm,
);
router.put("/:id/cancel", authenticate, validate(byIdSchema), ctrl.cancel);
router.put(
  "/:id/complete",
  authenticate,
  authorize("tutor"),
  validate(byIdSchema),
  ctrl.complete,
);
router.put(
  "/:id/student-confirm",
  authenticate,
  authorize("student"),
  validate(byIdSchema),
  ctrl.studentConfirm,
);
router.put(
  "/:id/dispute",
  authenticate,
  authorize("student"),
  validate(disputeSchema),
  ctrl.dispute,
);
router.put(
  "/:id/resolve",
  authenticate,
  authorize("platform_admin"),
  validate(resolveSchema),
  ctrl.resolve,
);

module.exports = router;
