const router = require("express").Router();
const {
  authenticate,
  authorize,
} = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate.middleware");
const { imageUpload } = require("../../config/uploads");
const {
  listSchema,
  toggleSchema,
  createCoordinatorSchema,
  preferencesSchema,
  profileSchema,
} = require("./users.schema");
const ctrl = require("./users.controller");

router.patch(
  "/me/preferences",
  authenticate,
  validate(preferencesSchema),
  ctrl.updatePreferences,
);

router.patch(
  "/me",
  authenticate,
  validate(profileSchema),
  ctrl.updateProfile,
);

router.post(
  "/me/avatar",
  authenticate,
  imageUpload.single("image"),
  ctrl.uploadAvatar,
);

router.get("/", authenticate, authorize("platform_admin"), validate(listSchema), ctrl.getAll);
router.post(
  "/coordinators",
  authenticate,
  authorize("platform_admin"),
  validate(createCoordinatorSchema),
  ctrl.createCoordinator,
);
router.put(
  "/:id/toggle",
  authenticate,
  authorize("platform_admin"),
  validate(toggleSchema),
  ctrl.toggleActive,
);

module.exports = router;
