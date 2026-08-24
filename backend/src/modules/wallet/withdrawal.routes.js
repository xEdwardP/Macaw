const router = require("express").Router();
const {
  authenticate,
  authorize,
} = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate.middleware");
const { idParam } = require("../../shared/validation/common");
const {
  createWithdrawalSchema,
  rejectWithdrawalSchema,
} = require("./wallet.schema");
const ctrl = require("./withdrawal.controller");

router.get("/", authenticate, ctrl.getAll);
router.post(
  "/",
  authenticate,
  authorize("tutor"),
  validate(createWithdrawalSchema),
  ctrl.create,
);
router.put(
  "/:id/approve",
  authenticate,
  authorize("platform_admin"),
  validate({ params: idParam }),
  ctrl.approve,
);
router.put(
  "/:id/reject",
  authenticate,
  authorize("platform_admin"),
  validate(rejectWithdrawalSchema),
  ctrl.reject,
);

module.exports = router;
