const router = require("express").Router();
const {
  authenticate,
  authorize,
} = require("../../middlewares/auth.middleware");
const ctrl = require("./withdrawal.controller");

router.get("/", authenticate, ctrl.getAll);
router.post("/", authenticate, authorize("tutor"), ctrl.create);
router.put("/:id/approve", authenticate, authorize("admin"), ctrl.approve);
router.put("/:id/reject", authenticate, authorize("admin"), ctrl.reject);

module.exports = router;
