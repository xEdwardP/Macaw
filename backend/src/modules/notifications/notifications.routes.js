const router = require("express").Router();
const { authenticate } = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate.middleware");
const { listSchema, byIdSchema } = require("./notifications.schema");
const ctrl = require("./notifications.controller");

router.get("/", authenticate, validate(listSchema), ctrl.list);
router.patch("/read-all", authenticate, ctrl.markAllRead);
router.patch("/:id/read", authenticate, validate(byIdSchema), ctrl.markRead);

module.exports = router;
