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

module.exports = router;
