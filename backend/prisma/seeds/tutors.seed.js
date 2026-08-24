const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();
const { PROGRAM_UNIT_MAP } = require("./users.seed");

const TUTORS_DATA = [
  {
    name: "Edward Javier Pineda Moran",
    email: "epineda@yopmail.com",
    program: "Ingeniería en Ciencias de la Computación",
    academicScore: 4.8,
    termNumber: 7,
    subjects: ["IF214", "IF303", "IF322", "IF213"],
    hourlyRate: 8,
    rating: 4.9,
  },
  {
    name: "Gabriela María Reconco Elvir",
    email: "greconco@unicah.edu",
    program: "Ingeniería en Ciencias de la Computación",
    academicScore: 4.7,
    termNumber: 6,
    subjects: ["IF327", "IF212", "IF323", "IF324"],
    hourlyRate: 7,
    rating: 4.7,
  },

  {
    name: "Sofía Alejandra Reyes Castillo",
    email: "sreyes@unicah.edu",
    program: "Medicina y Cirugía",
    academicScore: 4.9,
    termNumber: 8,
    subjects: ["AN101", "AN102", "FS102", "NR101"],
    hourlyRate: 10,
    rating: 4.8,
  },
  {
    name: "Fernando Daniel Morales Paz",
    email: "fmorales@unicah.edu",
    program: "Medicina y Cirugía",
    academicScore: 4.8,
    termNumber: 7,
    subjects: ["FS103", "PT101", "FR101", "FS104"],
    hourlyRate: 10,
    rating: 4.7,
  },

  {
    name: "Diego Alejandro Torres Vargas",
    email: "dtorres@unicah.edu",
    program: "Ingeniería Civil",
    academicScore: 4.7,
    termNumber: 6,
    subjects: ["ICIV001", "ICIV002", "ICIV003", "ICIV004"],
    hourlyRate: 7,
    rating: 4.7,
  },
  {
    name: "Mariela Concepción Turcios Suazo",
    email: "mturcios@unicah.edu",
    program: "Ingeniería Civil",
    academicScore: 4.6,
    termNumber: 7,
    subjects: ["ICIV008", "ICIV009", "ICIV010", "ICIV011"],
    hourlyRate: 7,
    rating: 4.6,
  },

  {
    name: "Valeria Andrea Cruz Pineda",
    email: "vcruz@unicah.edu",
    program: "Gestión Estratégica de Empresas",
    academicScore: 4.6,
    termNumber: 7,
    subjects: ["GEE017", "GEE020", "GEE022", "GEE023"],
    hourlyRate: 6,
    rating: 4.6,
  },
  {
    name: "Ronald Josué Flores Chirinos",
    email: "rflores@unicah.edu",
    program: "Gestión Estratégica de Empresas",
    academicScore: 4.5,
    termNumber: 6,
    subjects: ["GEE025", "GEE026", "GEE028", "GEE029"],
    hourlyRate: 6,
    rating: 4.5,
  },

  {
    name: "Roberto José Paz Aguilar",
    email: "rpaz@unicah.edu",
    program: "Derecho",
    academicScore: 4.5,
    termNumber: 8,
    subjects: ["LG101", "LG207", "LG204", "LG205"],
    hourlyRate: 9,
    rating: 4.5,
  },
  {
    name: "Diana Marcela Molina Orellana",
    email: "dmolina@unicah.edu",
    program: "Derecho",
    academicScore: 4.6,
    termNumber: 7,
    subjects: ["LG303", "LG306", "LG318", "LG314"],
    hourlyRate: 9,
    rating: 4.6,
  },

  {
    name: "Andrea Michelle López Soto",
    email: "alopez@unicah.edu",
    program: "Psicología",
    academicScore: 4.7,
    termNumber: 7,
    subjects: ["PS201", "PS202", "PS212", "PS203"],
    hourlyRate: 7,
    rating: 4.7,
  },
  {
    name: "Saúl Enrique Portillo Vargas",
    email: "sportillo@unicah.edu",
    program: "Psicología",
    academicScore: 4.5,
    termNumber: 6,
    subjects: ["PS308", "PS325", "PS258", "PS338"],
    hourlyRate: 7,
    rating: 4.5,
  },

  {
    name: "Marco Antonio Flores Herrera",
    email: "mflores@unicah.edu",
    program: "Mercadotecnia",
    academicScore: 4.5,
    termNumber: 6,
    subjects: ["MKT025", "MKT027", "MKT028", "MKT030"],
    hourlyRate: 6,
    rating: 4.5,
  },
  {
    name: "Heydi Marisol Membreño Lagos",
    email: "hmembreno@unicah.edu",
    program: "Mercadotecnia",
    academicScore: 4.4,
    termNumber: 7,
    subjects: ["MKT036", "MKT038", "MKT039", "MKT040"],
    hourlyRate: 6,
    rating: 4.4,
  },

  {
    name: "Gerardo Josué Vargas Mejía",
    email: "gvargas@unicah.edu",
    program: "Arquitectura",
    academicScore: 4.6,
    termNumber: 7,
    subjects: ["ARQ101", "ARQ201", "ARQ301", "ARQ401"],
    hourlyRate: 7,
    rating: 4.6,
  },
  {
    name: "Lilian Sofía Espinal Aguilera",
    email: "lespinal@unicah.edu",
    program: "Arquitectura",
    academicScore: 4.5,
    termNumber: 6,
    subjects: ["GEO101", "ARQ202", "ARQ302", "ARQ402"],
    hourlyRate: 7,
    rating: 4.5,
  },

  {
    name: "Josías David Zelaya Reconco",
    email: "jzelaya@unicah.edu",
    program: "Ciencias de la Comunicación",
    academicScore: 4.5,
    termNumber: 6,
    subjects: ["COM007", "COM008", "COM011", "COM012"],
    hourlyRate: 6,
    rating: 4.5,
  },
  {
    name: "Rebeca Lourdes Pineda Ordóñez",
    email: "rpineda@unicah.edu",
    program: "Ciencias de la Comunicación",
    academicScore: 4.4,
    termNumber: 7,
    subjects: ["COM016", "COM017", "COM018", "COM021"],
    hourlyRate: 6,
    rating: 4.4,
  },

  {
    name: "Bessy Lissette Hernández Chirinos",
    email: "bhernandez@unicah.edu",
    program: "Enfermería",
    academicScore: 4.6,
    termNumber: 7,
    subjects: ["FN101", "HS105", "AN103", "FS106"],
    hourlyRate: 7,
    rating: 4.6,
  },
  {
    name: "Geovanny Enrique Castillo Zelaya",
    email: "gcastillo@unicah.edu",
    program: "Enfermería",
    academicScore: 4.5,
    termNumber: 6,
    subjects: ["EN101", "EN102", "EN103", "EN104"],
    hourlyRate: 7,
    rating: 4.5,
  },

  {
    name: "Paola Fernanda Castillo Vega",
    email: "pcastillo@unicah.edu",
    program: "Cirugía Dental",
    academicScore: 4.7,
    termNumber: 7,
    subjects: ["AN104", "AN105", "AN106", "BM101"],
    hourlyRate: 9,
    rating: 4.7,
  },
  {
    name: "Andrés Felipe Guzmán Torres",
    email: "aguzman@unicah.edu",
    program: "Cirugía Dental",
    academicScore: 4.6,
    termNumber: 8,
    subjects: ["OD101", "OD102", "RD102", "OC101"],
    hourlyRate: 9,
    rating: 4.6,
  },
];

async function seedTutors(institutionId, allSubjects, units) {
  console.log("Seeding tutors...");

  const password = await bcrypt.hash("password123", 12);

  for (const t of TUTORS_DATA) {
    const unitCode = PROGRAM_UNIT_MAP[t.program];
    const academicUnitId = units[unitCode]?.id || null;

    if (!academicUnitId) console.warn(`Faculty not found for program: ${t.program}`);

    const tutor = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: {
        name: t.name,
        email: t.email,
        password,
        role: "tutor",
        program: t.program,
        academicScore: t.academicScore,
        termNumber: t.termNumber,
        institutionId,
        academicUnitId,
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
        bio: `Estudiante de ${t.program} con promedio ${t.academicScore}. Me apasiona enseñar y ayudar a mis compañeros.`,
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
