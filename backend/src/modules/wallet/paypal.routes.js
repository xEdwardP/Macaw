const router = require("express").Router();
const { authenticate } = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate.middleware");
const { createOrderSchema, captureOrderSchema } = require("./wallet.schema");
const ctrl = require("./paypal.controller");

router.post(
  "/create-order",
  authenticate,
  validate(createOrderSchema),
  ctrl.createOrder,
);
router.post(
  "/capture-order",
  authenticate,
  validate(captureOrderSchema),
  ctrl.captureOrder,
);
router.post("/webhook", ctrl.webhook);

module.exports = router;
