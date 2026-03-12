const router = require("express").Router();
const { authenticate } = require("../../middlewares/auth.middleware");
const ctrl = require("./ai.controller");

router.get("/recommendations", authenticate, ctrl.getRecommendations);
router.get("/review-summary/:tutorId", ctrl.getReviewSummary);

module.exports = router;
