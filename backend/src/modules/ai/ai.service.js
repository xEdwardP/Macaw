const OpenAI = require("openai");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const getRecommendations = async (studentId) => {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: {
      name: true,
      career: true,
      quarter: true,
      gpa: true,
      sessionsAsStudent: {
        where: { status: "completed" },
        include: { subject: true },
        orderBy: { date: "desc" },
        take: 10,
      },
    },
  });

  if (!student) throw new Error("Estudiante no encontrado");

  const tutors = await prisma.user.findMany({
    where: { role: "tutor", isActive: true },
    select: {
      id: true,
      name: true,
      career: true,
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
- Carrera: ${student.career}
- Trimestre: ${student.quarter}
- GPA: ${student.gpa}
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

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 500,
  });

  const raw = completion.choices[0].message.content.trim();
  const clean = raw.replace(/```json|```/g, "").trim();
  const data = JSON.parse(clean);

  const enriched = await Promise.all(
    data.recommendations.map(async (rec) => {
      const tutor = tutors.find((t) => t.id === rec.tutorId);
      return { ...rec, tutor };
    }),
  );

  return { recommendations: enriched };
};

const getReviewSummary = async (tutorId) => {
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

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 200,
  });

  const summary = completion.choices[0].message.content.trim();
  return { summary };
};

module.exports = { getRecommendations, getReviewSummary };
