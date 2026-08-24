const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const ACADEMIC_UNITS = [
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

async function seedAcademicUnits(institutionId) {
  console.log("Seeding units...");

  const units = {};
  for (const f of ACADEMIC_UNITS) {
    const unit = await prisma.academicUnit.upsert({
      where: { institutionId_code: { institutionId, code: f.code } },
      update: {},
      create: { ...f, institutionId },
    });
    units[f.code] = unit;
  }

  console.log(`${ACADEMIC_UNITS.length} units seeded`);
  return units;
}

module.exports = { seedAcademicUnits };
