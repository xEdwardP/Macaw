const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function seedUniversity() {
  console.log("Seeding university...");

  const university = await prisma.university.upsert({
    where: { domain: "unicah.edu" },
    update: {},
    create: {
      name: "Universidad Católica de Honduras",
      domain: "unicah.edu",
      commissionRate: 0.1,
    },
  });

  console.log("University seeded:", university.name);
  return university;
}

module.exports = { seedUniversity };
