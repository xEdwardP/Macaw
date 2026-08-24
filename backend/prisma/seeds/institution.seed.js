const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const INSTITUTIONS = [
  {
    name: "Universidad Católica de Honduras",
    domain: "unicah.edu",
    type: "university",
    currencyCode: "USD",
    timezone: "America/Tegucigalpa",
    planCode: "enterprise",
  },
  {
    name: "Instituto San José",
    domain: "sanjose.edu.hn",
    type: "college",
    currencyCode: "HNL",
    timezone: "America/Tegucigalpa",
    planCode: "basic",
  },
  {
    name: "Macaw Academy",
    domain: "macawacademy.com",
    type: "academy",
    currencyCode: "USD",
    timezone: "America/Tegucigalpa",
    planCode: "starter",
  },
];

async function seedInstitutions() {
  console.log("Seeding institutions...");

  const institutions = {};

  for (const { planCode, ...data } of INSTITUTIONS) {
    const institution = await prisma.institution.upsert({
      where: { domain: data.domain },
      update: {},
      create: data,
    });

    await prisma.institutionDomain.upsert({
      where: { domain: data.domain },
      update: {},
      create: {
        institutionId: institution.id,
        domain: data.domain,
        isPrimary: true,
        verifiedAt: new Date(),
      },
    });

    const plan = await prisma.plan.findUnique({ where: { code: planCode } });

    await prisma.subscription.upsert({
      where: { institutionId: institution.id },
      update: {},
      create: {
        institutionId: institution.id,
        planId: plan.id,
        status: "active",
      },
    });

    institutions[data.domain] = institution;
  }

  console.log(`${INSTITUTIONS.length} institutions seeded`);
  return institutions;
}

module.exports = { seedInstitutions, INSTITUTIONS };
