const router = require("express").Router();
const {
  authenticate,
  authorize,
} = require("../../middlewares/auth.middleware");
const ctrl = require("./universities.controller");

router.get("/subjects", ctrl.getSubjects);
router.get("/faculties", ctrl.getFaculties);
router.get("/faculties/:id/subjects", ctrl.getSubjectsByFaculty);
router.get("/list", authenticate, authorize("admin"), ctrl.getList);

router.post(
  "/subjects",
  authenticate,
  authorize("university"),
  ctrl.createSubject,
);
router.put(
  "/subjects/:id",
  authenticate,
  authorize("university"),
  ctrl.updateSubject,
);
router.delete(
  "/subjects/:id",
  authenticate,
  authorize("university"),
  ctrl.deleteSubject,
);

router.post(
  "/faculties",
  authenticate,
  authorize("university"),
  ctrl.createFaculty,
);
router.put(
  "/faculties/:id",
  authenticate,
  authorize("university"),
  ctrl.updateFaculty,
);
router.delete(
  "/faculties/:id",
  authenticate,
  authorize("university"),
  ctrl.deleteFaculty,
);
router.post(
  "/faculties/:id/subjects",
  authenticate,
  authorize("university"),
  ctrl.assignSubjectToFaculty,
);
router.delete(
  "/faculties/:id/subjects/:subjectId",
  authenticate,
  authorize("university"),
  ctrl.removeSubjectFromFaculty,
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
router.get(
  "/platform-earnings",
  authenticate,
  authorize("admin"),
  ctrl.getPlatformEarnings,
);
router.post(
  "/recharge",
  authenticate,
  authorize("admin"),
  ctrl.rechargeUniversity,
);
router.post(
  "/create-order",
  authenticate,
  authorize("university"),
  ctrl.createUniversityOrder,
);
router.post(
  "/capture-order",
  authenticate,
  authorize("university"),
  ctrl.captureUniversityOrder,
);

module.exports = router;
