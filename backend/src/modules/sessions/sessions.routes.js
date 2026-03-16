const router = require("express").Router();
const {
  authenticate,
  authorize,
} = require("../../middlewares/auth.middleware");
const ctrl = require("./sessions.controller");

router.get("/", authenticate, ctrl.getAll);
router.get("/:id", authenticate, ctrl.getOne);
router.get("/", authenticate, ctrl.getPaginated);
router.post("/", authenticate, authorize("student"), ctrl.create);
router.put("/:id/confirm", authenticate, authorize("tutor"), ctrl.confirm);
router.put("/:id/cancel", authenticate, ctrl.cancel);
router.put("/:id/complete", authenticate, authorize("tutor"), ctrl.complete);
router.put(
  "/:id/student-confirm",
  authenticate,
  authorize("student"),
  ctrl.studentConfirm,
);
router.put("/:id/dispute", authenticate, authorize("student"), ctrl.dispute);
router.put("/:id/resolve", authenticate, authorize("admin"), ctrl.resolve);

module.exports = router;
