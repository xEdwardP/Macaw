const router = require("express").Router();
const { authenticate, authorize } = require("../../middlewares/auth.middleware");
const ctrl = require("./wallet.controller");

router.get("/", authenticate, ctrl.getMyWallet);
router.get("/transactions", authenticate, ctrl.getTransactions);
router.post("/recharge", authenticate, authorize("admin"), ctrl.recharge);
router.post(
  "/subsidy",
  authenticate,
  authorize("admin", "university"),
  ctrl.addSubsidy,
);

module.exports = router;
