const prisma = require("../../config/prisma");
const { assertTutorVisible } = require("../policies/tutorAccess");
const {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} = require("../../shared/errors/AppError");
const ERROR_CODES = require("../../shared/errors/codes");

const getTutorReviews = async (ctx, tutorId, { limit = 10, offset = 0 }) => {
  await assertTutorVisible(tutorId, ctx);

  const where = { revieweeId: tutorId };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        reviewer: { select: { id: true, name: true, avatar: true } },
        session: { select: { id: true, date: true, subject: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  return { reviews, total, limit, offset };
};

const create = async (reviewerId, { sessionId, rating, comment }) => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });
  if (!session) throw new NotFoundError(ERROR_CODES.SESSION_NOT_FOUND, "Sesión no encontrada");

  if (session.status !== "completed")
    throw new ConflictError(ERROR_CODES.REVIEW_SESSION_NOT_COMPLETED, "Solo puedes reseñar sesiones completadas");

  if (session.studentId !== reviewerId) throw new ForbiddenError(ERROR_CODES.AUTH_FORBIDDEN, "No autorizado");

  const existing = await prisma.review.findUnique({
    where: { sessionId },
  });
  if (existing) throw new ConflictError(ERROR_CODES.REVIEW_ALREADY_EXISTS, "Ya existe una reseña para esta sesión");

  if (rating < 1 || rating > 5)
    throw new BadRequestError(ERROR_CODES.REVIEW_INVALID_RATING, "El rating debe ser entre 1 y 5");

  const review = await prisma.$transaction(async (tx) => {
    const newReview = await tx.review.create({
      data: {
        sessionId,
        reviewerId,
        revieweeId: session.tutorId,
        rating,
        comment,
      },
      include: {
        reviewer: { select: { id: true, name: true, avatar: true } },
        session: { select: { id: true, date: true } },
      },
    });

    const allReviews = await tx.review.findMany({
      where: { revieweeId: session.tutorId },
      select: { rating: true },
    });

    const avgRating =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await tx.tutorProfile.update({
      where: { userId: session.tutorId },
      data: { averageRating: parseFloat(avgRating.toFixed(2)) },
    });

    return newReview;
  });

  return review;
};

const remove = async (id) => {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw new NotFoundError(ERROR_CODES.REVIEW_NOT_FOUND, "Reseña no encontrada");

  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id } });

    const allReviews = await tx.review.findMany({
      where: { revieweeId: review.revieweeId },
      select: { rating: true },
    });

    const avgRating =
      allReviews.length > 0
        ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
        : 0;

    await tx.tutorProfile.update({
      where: { userId: review.revieweeId },
      data: { averageRating: parseFloat(avgRating.toFixed(2)) },
    });
  });
};

module.exports = { getTutorReviews, create, remove };
