const router = require("express").Router();
const { authenticate } = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate.middleware");
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
} = require("./auth.schema");
const adminSchemas = require("../institutions/admin.schema");
const ctrl = require("./auth.controller");
const institutionsAdmin = require("../institutions/admin.controller");

router.post("/register", validate(registerSchema), ctrl.register);
router.post("/login", validate(loginSchema), ctrl.login);
router.get("/profile", authenticate, ctrl.profile);

router.post(
  "/forgot-password",
  validate(forgotPasswordSchema),
  ctrl.forgotPassword,
);
router.post(
  "/reset-password",
  validate(resetPasswordSchema),
  ctrl.resetPassword,
);
router.patch(
  "/password",
  authenticate,
  validate(changePasswordSchema),
  ctrl.changePassword,
);

router.post("/verify-email", validate(verifyEmailSchema), ctrl.verifyEmail);
router.post("/verify-email/resend", authenticate, ctrl.resendVerification);

router.get(
  "/invitations/:token",
  validate(adminSchemas.invitationTokenSchema),
  institutionsAdmin.describeInvitation,
);
router.post(
  "/invitations/accept",
  validate(adminSchemas.acceptInvitationSchema),
  institutionsAdmin.acceptInvitation,
);

module.exports = router;
