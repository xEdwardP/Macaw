const router = require("express").Router();
const {
  authenticate,
  authorize,
} = require("../../middlewares/auth.middleware");
const ctrl = require("./users.controller");

router.get("/", authenticate, authorize("admin"), ctrl.getAll);
router.put("/:id/toggle", authenticate, authorize("admin"), ctrl.toggleActive);

module.exports = router;
