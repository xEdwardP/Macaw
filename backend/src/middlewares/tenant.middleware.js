const prisma = require("../config/prisma");
const { prismaForTenant } = require("../shared/tenant/prismaForTenant");
const { resolveSettings } = require("../config/institutionSettings");
const { ForbiddenError } = require("../shared/errors/AppError");
const ERROR_CODES = require("../shared/errors/codes");
const asyncHandler = require("../shared/http/asyncHandler");

const institutionSelect = {
  id: true,
  name: true,
  type: true,
  status: true,
  domain: true,
  currencyCode: true,
  commissionRate: true,
  settings: true,
  timezone: true,
  locale: true,
  primaryColor: true,
  logo: true,
};

const tenantContext = asyncHandler(async (req, res, next) => {
  const isPlatformAdmin = req.user?.role === "platform_admin";
  const institutionId = isPlatformAdmin ? null : req.user?.institutionId;

  const institution = institutionId
    ? await prisma.institution.findUnique({
        where: { id: institutionId },
        select: institutionSelect,
      })
    : null;

  if (institution && institution.status === "suspended")
    throw new ForbiddenError(
      ERROR_CODES.INSTITUTION_SUSPENDED,
      "Tu institución está suspendida. Contacta al administrador.",
    );

  req.tenant = {
    institutionId: institution?.id || null,
    institution,
    settings: institution ? resolveSettings(institution) : null,
    isPlatformAdmin,
    user: req.user,
    db: prismaForTenant(institution?.id || null),
  };

  next();
});

module.exports = { tenantContext, institutionSelect };
