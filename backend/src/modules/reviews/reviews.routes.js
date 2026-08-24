const router = require("express").Router();
const {
  authenticate,
  authorize,
} = require("../../middlewares/auth.middleware");
const { tenantContext } = require("../../middlewares/tenant.middleware");
const validate = require("../../middlewares/validate.middleware");
const { listSchema, createSchema, removeSchema } = require("./reviews.schema");
const ctrl = require("./reviews.controller");

router.get(
  "/tutor/:tutorId",
  authenticate,
  tenantContext,
  validate(listSchema),
  ctrl.getTutorReviews,
);
router.post(
  "/",
  authenticate,
  authorize("student"),
  validate(createSchema),
  ctrl.create,
);
router.delete(
  "/:id",
  authenticate,
  authorize("platform_admin"),
  validate(removeSchema),
  ctrl.remove,
);

module.exports = router;
