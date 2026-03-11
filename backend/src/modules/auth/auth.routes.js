const router = require("express").Router();
const { authenticate } = require("../../middlewares/auth.middleware");
const ctrl = require("./auth.controller");

router.post("/register", ctrl.register);
router.post("/login", ctrl.login);
router.get("/profile", authenticate, ctrl.profile);

module.exports = router;
