const router = require("express").Router();
const {
  authenticate,
  authorize,
} = require("../../middlewares/auth.middleware");
const { tenantContext } = require("../../middlewares/tenant.middleware");
const validate = require("../../middlewares/validate.middleware");
const {
  transactionsSchema,
  rechargeSchema,
  subsidySchema,
} = require("./wallet.schema");
const ctrl = require("./wallet.controller");

router.get("/", authenticate, ctrl.getMyWallet);
router.get(
  "/transactions",
  authenticate,
  validate(transactionsSchema),
  ctrl.getTransactions,
);
router.post(
  "/recharge",
  authenticate,
  authorize("platform_admin"),
  validate(rechargeSchema),
  ctrl.recharge,
);
router.post(
  "/subsidy",
  authenticate,
  authorize("platform_admin", "institution_admin"),
  tenantContext,
  validate(subsidySchema),
  ctrl.addSubsidy,
);

module.exports = router;
