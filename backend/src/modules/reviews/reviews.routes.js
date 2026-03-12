const router = require("express").Router();
const {
  authenticate,
  authorize,
} = require("../../middlewares/auth.middleware");
const ctrl = require("./reviews.controller");

router.get("/tutor/:tutorId", ctrl.getTutorReviews);
router.post("/", authenticate, authorize("student"), ctrl.create);
router.delete("/:id", authenticate, authorize("admin"), ctrl.remove);

module.exports = router;
