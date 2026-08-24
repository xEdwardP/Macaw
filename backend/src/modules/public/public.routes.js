const router = require("express").Router();
const validate = require("../../middlewares/validate.middleware");
const schemas = require("./public.schema");
const ctrl = require("./public.controller");

router.get("/institutions", ctrl.listInstitutions);
router.get(
  "/institutions/resolve",
  validate(schemas.resolveSchema),
  ctrl.resolveInstitution,
);

module.exports = router;
