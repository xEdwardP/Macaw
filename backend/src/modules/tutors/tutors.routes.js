const router = require("express").Router();
const { authenticate, authorize } = require("../../middlewares/auth.middleware");
const ctrl = require("./tutors.controller");

router.get("/", ctrl.getAll);
router.get("/:id", ctrl.getOne);
router.put("/profile", authenticate, authorize("tutor"), ctrl.updateProfile);
router.post("/subjects", authenticate, authorize("tutor"), ctrl.addSubject);
router.delete(
  "/subjects/:subjectId",
  authenticate,
  authorize("tutor"),
  ctrl.removeSubject,
);

module.exports = router;
