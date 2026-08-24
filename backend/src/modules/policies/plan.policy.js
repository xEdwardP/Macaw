const prisma = require("../../config/prisma");
const { ForbiddenError } = require("../../shared/errors/AppError");
const ERROR_CODES = require("../../shared/errors/codes");

const assertPlanAllowsNewStudent = async (institutionId) => {
  if (!institutionId) return;

  const subscription = await prisma.subscription.findUnique({
    where: { institutionId },
    include: { plan: true },
  });

  if (!subscription?.plan?.maxStudents) return;

  const currentStudents = await prisma.user.count({
    where: { institutionId, role: "student", isActive: true },
  });

  if (currentStudents >= subscription.plan.maxStudents)
    throw new ForbiddenError(
      ERROR_CODES.PLAN_STUDENT_LIMIT_REACHED,
      "Tu institución alcanzó el número máximo de estudiantes de su plan. Contacta a tu institución.",
      { maxStudents: subscription.plan.maxStudents },
    );
};

module.exports = { assertPlanAllowsNewStudent };
