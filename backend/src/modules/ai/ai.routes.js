const router = require("express").Router();
const { authenticate } = require("../../middlewares/auth.middleware");
const { tenantContext } = require("../../middlewares/tenant.middleware");
const validate = require("../../middlewares/validate.middleware");
const { z } = require("zod");
const ctrl = require("./ai.controller");

const tutorIdSchema = { params: z.object({ tutorId: z.string().min(1) }) };

router.get(
  "/recommendations",
  authenticate,
  tenantContext,
  ctrl.getRecommendations,
);
router.get(
  "/review-summary/:tutorId",
  authenticate,
  tenantContext,
  validate(tutorIdSchema),
  ctrl.getReviewSummary,
);

module.exports = router;
