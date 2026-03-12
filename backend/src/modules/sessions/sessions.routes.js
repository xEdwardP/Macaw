const router = require("express").Router();
const {
  authenticate,
  authorize,
} = require("../../middlewares/auth.middleware");
const ctrl = require("./sessions.controller");

router.get("/", authenticate, ctrl.getAll);
router.get("/:id", authenticate, ctrl.getOne);
router.post("/", authenticate, authorize("student"), ctrl.create);
router.put("/:id/confirm", authenticate, authorize("tutor"), ctrl.confirm);
router.put("/:id/cancel", authenticate, ctrl.cancel);
router.put("/:id/complete", authenticate, authorize("tutor"), ctrl.complete);

module.exports = router;
