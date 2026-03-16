const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();
const { CAREER_FACULTY_MAP } = require("./users.seed");

const TUTORS_DATA = [
  {
    name: "Edward Javier Pineda Moran",
    email: "epineda@unicah.edu",
    career: "Ingeniería en Ciencias de la Computación",
    gpa: 4.8,
    quarter: 7,
    subjects: ["SIS101", "SIS102", "SIS201", "MAT101"],
    hourlyRate: 8,
    rating: 4.9,
  },
  {
    name: "Gabriela María Reconco Elvir",
    email: "greconco@unicah.edu",
    career: "Ingeniería en Ciencias de la Computación",
    gpa: 4.7,
    quarter: 6,
    subjects: ["SIS301", "SIS401", "SIS402", "MAT102"],
    hourlyRate: 7,
    rating: 4.7,
  },
  {
    name: "Sofía Alejandra Reyes Castillo",
    email: "sreyes@unicah.edu",
    career: "Medicina y Cirugía",
    gpa: 4.9,
    quarter: 8,
    subjects: ["MED101", "MED102", "MED201", "MED301"],
    hourlyRate: 10,
    rating: 4.8,
  },
  {
    name: "Fernando Daniel Morales Paz",
    email: "fmorales@unicah.edu",
    career: "Medicina y Cirugía",
    gpa: 4.8,
    quarter: 7,
    subjects: ["MED401", "MED501", "MED601", "MED201"],
    hourlyRate: 10,
    rating: 4.7,
  },
  {
    name: "Diego Alejandro Torres Vargas",
    email: "dtorres@unicah.edu",
    career: "Ingeniería Civil",
    gpa: 4.7,
    quarter: 6,
    subjects: ["MAT101", "MAT102", "FIS101", "CIV301"],
    hourlyRate: 7,
    rating: 4.7,
  },
  {
    name: "Mariela Concepción Turcios Suazo",
    email: "mturcios@unicah.edu",
    career: "Ingeniería Civil",
    gpa: 4.6,
    quarter: 7,
    subjects: ["FIS102", "CIV401", "CIV501", "MAT201"],
    hourlyRate: 7,
    rating: 4.6,
  },
  {
    name: "Valeria Andrea Cruz Pineda",
    email: "vcruz@unicah.edu",
    career: "Gestión Estratégica de Empresas",
    gpa: 4.6,
    quarter: 7,
    subjects: ["CON101", "ECO101", "GEE101", "MAT001"],
    hourlyRate: 6,
    rating: 4.6,
  },
  {
    name: "Ronald Josué Flores Chirinos",
    email: "rflores@unicah.edu",
    career: "Gestión Estratégica de Empresas",
    gpa: 4.5,
    quarter: 6,
    subjects: ["CON102", "GEE301", "EST101", "MAT001"],
    hourlyRate: 6,
    rating: 4.5,
  },
  {
    name: "Roberto José Paz Aguilar",
    email: "rpaz@unicah.edu",
    career: "Derecho",
    gpa: 4.5,
    quarter: 8,
    subjects: ["DER101", "DER201", "DER301", "DER401"],
    hourlyRate: 9,
    rating: 4.5,
  },
  {
    name: "Diana Marcela Molina Orellana",
    email: "dmolina@unicah.edu",
    career: "Derecho",
    gpa: 4.6,
    quarter: 7,
    subjects: ["DER102", "DER501", "DER301", "DER401"],
    hourlyRate: 9,
    rating: 4.6,
  },
  {
    name: "Andrea Michelle López Soto",
    email: "alopez@unicah.edu",
    career: "Psicología",
    gpa: 4.7,
    quarter: 7,
    subjects: ["PSI101", "PSI201", "PSI301", "MET001"],
    hourlyRate: 7,
    rating: 4.7,
  },
  {
    name: "Saúl Enrique Portillo Vargas",
    email: "sportillo@unicah.edu",
    career: "Psicología",
    gpa: 4.5,
    quarter: 6,
    subjects: ["PSI401", "PSI501", "EST101", "MET001"],
    hourlyRate: 7,
    rating: 4.5,
  },
  {
    name: "Marco Antonio Flores Herrera",
    email: "mflores@unicah.edu",
    career: "Mercadotecnia",
    gpa: 4.5,
    quarter: 6,
    subjects: ["MKT101", "MKT201", "MKT301", "CON101"],
    hourlyRate: 6,
    rating: 4.5,
  },
  {
    name: "Heydi Marisol Membreño Lagos",
    email: "hmembreno@unicah.edu",
    career: "Mercadotecnia",
    gpa: 4.4,
    quarter: 7,
    subjects: ["MKT401", "MKT501", "CON101", "EST101"],
    hourlyRate: 6,
    rating: 4.4,
  },
  {
    name: "Gerardo Josué Vargas Mejía",
    email: "gvargas@unicah.edu",
    career: "Arquitectura",
    gpa: 4.6,
    quarter: 7,
    subjects: ["ARQ101", "ARQ102", "ARQ201", "MAT101"],
    hourlyRate: 7,
    rating: 4.6,
  },
  {
    name: "Lilian Sofía Espinal Aguilera",
    email: "lespinal@unicah.edu",
    career: "Arquitectura",
    gpa: 4.5,
    quarter: 6,
    subjects: ["ARQ301", "ARQ401", "MAT101", "MAT001"],
    hourlyRate: 7,
    rating: 4.5,
  },
  {
    name: "Josías David Zelaya Reconco",
    email: "jzelaya@unicah.edu",
    career: "Ciencias de la Comunicación",
    gpa: 4.5,
    quarter: 6,
    subjects: ["COM101", "COM201", "COM301", "MET001"],
    hourlyRate: 6,
    rating: 4.5,
  },
  {
    name: "Rebeca Lourdes Pineda Ordóñez",
    email: "rpineda@unicah.edu",
    career: "Ciencias de la Comunicación",
    gpa: 4.4,
    quarter: 7,
    subjects: ["COM401", "COM501", "COM301", "MET001"],
    hourlyRate: 6,
    rating: 4.4,
  },
  {
    name: "Bessy Lissette Hernández Chirinos",
    email: "bhernandez@unicah.edu",
    career: "Enfermería",
    gpa: 4.6,
    quarter: 7,
    subjects: ["ENF101", "ENF201", "MED401", "MET001"],
    hourlyRate: 7,
    rating: 4.6,
  },
  {
    name: "Geovanny Enrique Castillo Zelaya",
    email: "gcastillo@unicah.edu",
    career: "Enfermería",
    gpa: 4.5,
    quarter: 6,
    subjects: ["ENF401", "ENF501", "ENF201", "MET001"],
    hourlyRate: 7,
    rating: 4.5,
  },
  {
    name: "Paola Fernanda Castillo Vega",
    email: "pcastillo@unicah.edu",
    career: "Cirugía Dental",
    gpa: 4.7,
    quarter: 7,
    subjects: ["DEN101", "DEN201", "DEN301", "MED201"],
    hourlyRate: 9,
    rating: 4.7,
  },
  {
    name: "Andrés Felipe Guzmán Torres",
    email: "aguzman@unicah.edu",
    career: "Cirugía Dental",
    gpa: 4.6,
    quarter: 8,
    subjects: ["DEN401", "DEN501", "DEN301", "MED201"],
    hourlyRate: 9,
    rating: 4.6,
  },
];

async function seedTutors(universityId, allSubjects, faculties) {
  console.log("Seeding tutors...");

  const password = await bcrypt.hash("password123", 12);

  for (const t of TUTORS_DATA) {
    const facultyCode = CAREER_FACULTY_MAP[t.career];
    const facultyId = faculties[facultyCode]?.id || null;

    if (!facultyId) console.warn(`Faculty not found for career: ${t.career}`);

    const tutor = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: {
        name: t.name,
        email: t.email,
        password,
        role: "tutor",
        career: t.career,
        gpa: t.gpa,
        quarter: t.quarter,
        universityId,
        facultyId,
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
        bio: `Estudiante de ${t.career} con promedio ${t.gpa}. Me apasiona enseñar y ayudar a mis compañeros.`,
        hourlyRate: t.hourlyRate,
        isVerified: true,
        totalSessions: Math.floor(Math.random() * 30) + 5,
        averageRating: t.rating,
        badges: ["verified", "top_rated"],
      },
    });

    for (const subjectCode of t.subjects) {
      if (!allSubjects[subjectCode]) {
        console.warn(`Subject not found: ${subjectCode}`);
        continue;
      }
      await prisma.tutorSubject.upsert({
        where: {
          tutorProfileId_subjectId: {
            tutorProfileId: profile.id,
            subjectId: allSubjects[subjectCode].id,
          },
        },
        update: {},
        create: {
          tutorProfileId: profile.id,
          subjectId: allSubjects[subjectCode].id,
          level: "advanced",
        },
      });
    }

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

  console.log(`${TUTORS_DATA.length} tutors seeded`);
}

module.exports = { seedTutors };
