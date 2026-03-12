const router = require("express").Router();
const {
  authenticate,
  authorize,
} = require("../../middlewares/auth.middleware");
const ctrl = require("./universities.controller");

router.get("/subjects", ctrl.getSubjects);
router.post(
  "/subjects",
  authenticate,
  authorize("admin", "university"),
  ctrl.createSubject,
);
router.get(
  "/analytics",
  authenticate,
  authorize("admin", "university"),
  ctrl.getAnalytics,
);
router.get(
  "/students",
  authenticate,
  authorize("admin", "university"),
  ctrl.getStudents,
);
router.get(
  "/subsidies",
  authenticate,
  authorize("admin", "university"),
  ctrl.getSubsidies,
);

module.exports = router;
