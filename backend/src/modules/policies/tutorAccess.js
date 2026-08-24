const prisma = require("../../config/prisma");
const policy = require("./tutoring.policy");
const { ForbiddenError, NotFoundError } = require("../../shared/errors/AppError");
const ERROR_CODES = require("../../shared/errors/codes");

const policyInstitutionSelect = {
  id: true,
  type: true,
  currencyCode: true,
  settings: true,
};

const bookableInstitutionIds = async (ctx) => {
  if (ctx.isPlatformAdmin) return null;
  if (!ctx.institution) return [];

  const candidates = await prisma.institution.findMany({
    where: { status: "active" },
    select: policyInstitutionSelect,
  });

  return policy.visibleInstitutionIds(ctx.institution, candidates);
};

const assertTutorVisible = async (tutorId, ctx) => {
  const tutor = await prisma.user.findUnique({
    where: { id: tutorId },
    select: {
      id: true,
      role: true,
      isActive: true,
      institutionId: true,
      institution: { select: policyInstitutionSelect },
      tutorMemberships: {
        where: { status: "verified" },
        select: { institutionId: true },
      },
    },
  });

  if (!tutor || tutor.role !== "tutor" || !tutor.isActive)
    throw new NotFoundError(ERROR_CODES.TUTOR_NOT_FOUND, "Tutor no encontrado");

  if (ctx.isPlatformAdmin) return tutor;

  const verifiedIn = tutor.tutorMemberships.map((row) => row.institutionId);

  if (!verifiedIn.includes(ctx.institutionId))
    throw new ForbiddenError(
      ERROR_CODES.TUTOR_NOT_VERIFIED_IN_INSTITUTION,
      "Este tutor todavía no está verificado por tu institución",
    );

  return tutor;
};

module.exports = {
  policyInstitutionSelect,
  bookableInstitutionIds,
  assertTutorVisible,
};
