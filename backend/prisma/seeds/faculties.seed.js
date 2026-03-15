const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const FACULTIES = [
  { name: "Arquitectura", code: "ARQ" },
  { name: "Ciencias de la Comunicación", code: "COM" },
  { name: "Cirugía Dental", code: "DEN" },
  { name: "Derecho", code: "DER" },
  { name: "Enfermería", code: "ENF" },
  { name: "Gestión Estratégica de Empresas", code: "GEE" },
  { name: "Ingeniería Civil", code: "ICIV" },
  { name: "Ingeniería en Ciencias de la Computación", code: "ICC" },
  { name: "Ingeniería Industrial", code: "IIND" },
  { name: "Medicina y Cirugía", code: "MED" },
  { name: "Mercadotecnia", code: "MKT" },
  { name: "Psicología", code: "PSI" },
];

async function seedFaculties(universityId) {
  console.log("Seeding faculties...");

  const faculties = {};
  for (const f of FACULTIES) {
    const faculty = await prisma.faculty.upsert({
      where: { universityId_code: { universityId, code: f.code } },
      update: {},
      create: { ...f, universityId },
    });
    faculties[f.code] = faculty;
  }

  console.log(`${FACULTIES.length} faculties seeded`);
  return faculties;
}

module.exports = { seedFaculties };
