const OpenAI = require("openai");
const env = require("../../config/env");
const prisma = require("../../config/prisma");
const {
  bookableInstitutionIds,
  assertTutorVisible,
} = require("../policies/tutorAccess");
const {
  BadRequestError,
  NotFoundError,
  ServiceUnavailableError,
} = require("../../shared/errors/AppError");
const ERROR_CODES = require("../../shared/errors/codes");

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const complete = async (params) => {
  if (!env.OPENAI_API_KEY)
    throw new ServiceUnavailableError(
      ERROR_CODES.AI_NOT_CONFIGURED,
      "El servicio de IA no está configurado",
    );

  try {
    return await openai.chat.completions.create(params);
  } catch (err) {
    throw new ServiceUnavailableError(
      ERROR_CODES.AI_NOT_CONFIGURED,
      "El servicio de IA no está disponible en este momento",
      { reason: err.message },
    );
  }
};

const getRecommendations = async (ctx) => {
  const studentId = ctx.user.id;

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: {
      name: true,
      program: true,
      termNumber: true,
      academicScore: true,
      sessionsAsStudent: {
        where: { status: "completed" },
        include: { subject: true },
        orderBy: { date: "desc" },
        take: 10,
      },
    },
  });

  if (!student) throw new NotFoundError(ERROR_CODES.USER_NOT_FOUND, "Estudiante no encontrado");

  const allowedInstitutionIds = await bookableInstitutionIds(ctx);

  const tutors = await prisma.user.findMany({
    where: {
      role: "tutor",
      isActive: true,
      tutorProfile: { isNot: null },
      ...(allowedInstitutionIds && {
        institutionId: { in: allowedInstitutionIds },
      }),
    },
    select: {
      id: true,
      name: true,
      program: true,
      tutorProfile: {
        select: {
          bio: true,
          hourlyRate: true,
          averageRating: true,
          totalSessions: true,
          subjects: {
            include: { subject: true },
          },
        },
      },
    },
    take: 20,
  });

  const subjectsStudied =
    student.sessionsAsStudent.map((s) => s.subject.name).join(", ") ||
    "ninguna aún";

  const tutorList = tutors.map((t) => ({
    id: t.id,
    name: t.name,
    rating: t.tutorProfile?.averageRating,
    rate: t.tutorProfile?.hourlyRate,
    subjects: t.tutorProfile?.subjects.map((s) => s.subject.name).join(", "),
  }));

  const prompt = `
Eres un asistente de recomendación de tutores universitarios.

Estudiante:
- Nombre: ${student.name}
- Programa: ${student.program}
- Periodo: ${student.termNumber}
- Promedio: ${student.academicScore}
- Materias estudiadas recientemente: ${subjectsStudied}

Tutores disponibles:
${tutorList.map((t, i) => `${i + 1}. ID: ${t.id} | Nombre: ${t.name} | Rating: ${t.rating} | Precio: $${t.rate}/hr | Materias: ${t.subjects}`).join("\n")}

Recomienda los 3 mejores tutores para este estudiante basándote en su carrera, semestre y historial.
Responde SOLO en JSON con este formato exacto, sin texto adicional:
{
  "recommendations": [
    {
      "tutorId": "id_del_tutor",
      "reason": "Razón breve de la recomendación"
    }
  ]
}
`;

  const completion = await complete({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 500,
  });

  const raw = completion.choices[0].message.content.trim();
  const clean = raw.replace(/```json|```/g, "").trim();

  let data;
  try {
    data = JSON.parse(clean);
  } catch {
    throw new BadRequestError(ERROR_CODES.AI_INVALID_RESPONSE, "La IA devolvió una respuesta inválida, intenta de nuevo");
  }

  const enriched = data.recommendations
    .map((rec) => {
      const tutor = tutors.find((t) => t.id === rec.tutorId);
      return tutor ? { ...rec, tutor } : null;
    })
    .filter(Boolean);

  return { recommendations: enriched };
};

const getReviewSummary = async (tutorId, ctx) => {
  await assertTutorVisible(tutorId, ctx);

  const reviews = await prisma.review.findMany({
    where: { revieweeId: tutorId },
    select: { rating: true, comment: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  if (reviews.length === 0)
    return {
      summary:
        "Este tutor aún no tiene reseñas suficientes para generar un resumen.",
    };

  const reviewText = reviews
    .filter((r) => r.comment)
    .map((r, i) => `${i + 1}. Rating: ${r.rating}/5 - "${r.comment}"`)
    .join("\n");

  if (!reviewText)
    return {
      summary: "Las reseñas de este tutor no contienen comentarios aún.",
    };

  const prompt = `
Eres un asistente que resume reseñas de tutores universitarios.

Aquí están las reseñas del tutor:
${reviewText}

Genera un resumen breve y objetivo en español (máximo 3 oraciones) que destaque los puntos fuertes y áreas de mejora del tutor.
Responde SOLO con el texto del resumen, sin títulos ni formato adicional.
`;

  const completion = await complete({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 200,
  });

  const summary = completion.choices[0].message.content.trim();
  return { summary };
};

module.exports = { getRecommendations, getReviewSummary };
