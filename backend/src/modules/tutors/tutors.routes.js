const router = require("express").Router();
const {
  authenticate,
  authorize,
} = require("../../middlewares/auth.middleware");
const ctrl = require("./tutors.controller");

router.get("/", ctrl.getAll);
router.get("/:id", ctrl.getOne);
router.get("/:id/availability", ctrl.getAvailability);
router.put("/profile", authenticate, authorize("tutor"), ctrl.updateProfile);
router.post("/subjects", authenticate, authorize("tutor"), ctrl.addSubject);
router.delete(
  "/subjects/:subjectId",
  authenticate,
  authorize("tutor"),
  ctrl.removeSubject,
);
router.post(
  "/availability",
  authenticate,
  authorize("tutor"),
  ctrl.setAvailability,
);

module.exports = router;
