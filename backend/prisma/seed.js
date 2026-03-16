const { PrismaClient } = require("@prisma/client");
const { seedUniversity } = require("./seeds/university.seed");
const { seedFaculties } = require("./seeds/faculties.seed");
const { seedSubjects } = require("./seeds/subjects.seed");
const { seedUsers } = require("./seeds/users.seed");
const { seedTutors } = require("./seeds/tutors.seed");

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Macaw seed...");

  const university = await seedUniversity();
  const faculties = await seedFaculties(university.id);
  const subjects = await seedSubjects(faculties);
  await seedUsers(university.id, faculties);
  await seedTutors(university.id, subjects, faculties);

  console.log("Seed completado exitosamente");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
