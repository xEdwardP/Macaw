const router = require("express").Router();
const { authenticate } = require("../../middlewares/auth.middleware");

router.get("/", authenticate, (req, res) => {
  res.json({ success: true, message: "coming soon", data: [] });
});

module.exports = router;
