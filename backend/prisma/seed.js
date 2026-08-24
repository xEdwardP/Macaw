const { PrismaClient } = require("@prisma/client");
const { seedCatalog } = require("./seeds/catalog.seed");
const { seedInstitutions } = require("./seeds/institution.seed");
const { seedAcademicUnits } = require("./seeds/academicUnits.seed");
const { seedSubjects } = require("./seeds/subjects.seed");
const { seedUsers } = require("./seeds/users.seed");
const { seedTutors } = require("./seeds/tutors.seed");

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Macaw seed...");

  await seedCatalog();

  const institutions = await seedInstitutions();
  const mainInstitution = institutions["unicah.edu"];

  const units = await seedAcademicUnits(mainInstitution.id);
  const subjects = await seedSubjects(mainInstitution.id, units);
  await seedUsers(mainInstitution.id, units);
  await seedTutors(mainInstitution.id, subjects, units);

  console.log("Seed completado exitosamente");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
