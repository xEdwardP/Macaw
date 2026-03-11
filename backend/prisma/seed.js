const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Macaw database...");

  // Universidad
  const university = await prisma.university.upsert({
    where: { domain: "unicah.edu" },
    update: {},
    create: {
      name: "Universidad Católica de Honduras",
      domain: "unicah.edu",
      commissionRate: 0.1,
    },
  });

  // Materias
  const subjects = [
    { name: "Cálculo I", code: "MAT101", area: "Matemáticas" },
    { name: "Cálculo II", code: "MAT102", area: "Matemáticas" },
    { name: "Álgebra Lineal", code: "MAT201", area: "Matemáticas" },
    { name: "Programación I", code: "SIS101", area: "Sistemas" },
    { name: "Programación II", code: "SIS102", area: "Sistemas" },
    { name: "Estructuras de Datos", code: "SIS201", area: "Sistemas" },
    { name: "Base de Datos", code: "SIS301", area: "Sistemas" },
    { name: "Física I", code: "FIS101", area: "Ciencias" },
    { name: "Química General", code: "QUI101", area: "Ciencias" },
    { name: "Anatomía", code: "MED101", area: "Medicina" },
  ];

  for (const s of subjects) {
    await prisma.subject.upsert({
      where: { id: s.code },
      update: {},
      create: { id: s.code, ...s, universityId: university.id },
    });
  }

  const password = await bcrypt.hash("password123", 12);

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@macaw.app" },
    update: {},
    create: {
      name: "Admin Macaw",
      email: "admin@macaw.app",
      password,
      role: "admin",
    },
  });
  await prisma.wallet.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  });

  // Estudiantes
  const studentsData = [
    {
      name: "María García",
      email: "maria@unicah.edu",
      career: "Ingeniería en Sistemas",
    },
    { name: "Carlos López", email: "carlos@unicah.edu", career: "Medicina" },
    { name: "Ana Martínez", email: "ana@unicah.edu", career: "Derecho" },
  ];

  for (const s of studentsData) {
    const student = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        ...s,
        password,
        role: "student",
        universityId: university.id,
        semester: 3,
      },
    });
    await prisma.wallet.upsert({
      where: { userId: student.id },
      update: {},
      create: { userId: student.id, balance: 50 },
    });
  }

  // Tutores
  const tutorsData = [
    {
      name: "Luis Hernández",
      email: "luis@unicah.edu",
      career: "Ingeniería en Sistemas",
      gpa: 4.8,
    },
    {
      name: "Sofia Reyes",
      email: "sofia@unicah.edu",
      career: "Medicina",
      gpa: 4.9,
    },
    {
      name: "Diego Torres",
      email: "diego@unicah.edu",
      career: "Ingeniería en Sistemas",
      gpa: 4.7,
    },
  ];

  for (const t of tutorsData) {
    const tutor = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: {
        ...t,
        password,
        role: "tutor",
        universityId: university.id,
        semester: 7,
      },
    });

    await prisma.wallet.upsert({
      where: { userId: tutor.id },
      update: {},
      create: { userId: tutor.id, balance: 100 },
    });

    const profile = await prisma.tutorProfile.upsert({
      where: { userId: tutor.id },
      update: {},
      create: {
        userId: tutor.id,
        bio: `Estudiante de ${t.career} con promedio ${t.gpa}. Me apasiona enseñar.`,
        hourlyRate: 8.0,
        isVerified: true,
        totalSessions: Math.floor(Math.random() * 30) + 5,
        averageRating: parseFloat((4.5 + Math.random() * 0.5).toFixed(1)),
        badges: ["verified", "top_rated"],
      },
    });

    // Agregar materias al tutor
    const subjectIds = ["MAT101", "MAT102", "SIS101"];
    for (const subjectId of subjectIds) {
      await prisma.tutorSubject.upsert({
        where: {
          tutorProfileId_subjectId: {
            tutorProfileId: profile.id,
            subjectId,
          },
        },
        update: {},
        create: {
          tutorProfileId: profile.id,
          subjectId,
          level: "advanced",
        },
      });
    }

    // Disponibilidad lunes a viernes
    for (let day = 1; day <= 5; day++) {
      await prisma.availability
        .create({
          data: {
            tutorProfileId: profile.id,
            dayOfWeek: day,
            startTime: "08:00",
            endTime: "18:00",
          },
        })
        .catch(() => {});
    }
  }

  console.log("Seed completado");
  console.log("Credenciales demo:");
  console.log("  Admin:      admin@macaw.app    / password123");
  console.log("  Estudiante: maria@unicah.edu   / password123");
  console.log("  Tutor:      luis@unicah.edu    / password123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
