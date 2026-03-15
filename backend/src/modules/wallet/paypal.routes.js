const router = require("express").Router();
const { authenticate } = require("../../middlewares/auth.middleware");
const ctrl = require("./paypal.controller");

router.post("/create-order", authenticate, ctrl.createOrder);
router.post("/capture-order", authenticate, ctrl.captureOrder);

module.exports = router;
