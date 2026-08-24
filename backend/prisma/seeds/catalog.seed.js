const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const CURRENCIES = [
  { code: "USD", name: "Dólar estadounidense", symbol: "$", displayOrder: 1 },
];

const PLANS = [
  {
    code: "starter",
    name: "Starter",
    maxStudents: 200,
    priceMonthly: 49,
    displayOrder: 1,
    features: { analytics: false, csvImport: false, customBranding: false },
  },
  {
    code: "basic",
    name: "Básico",
    maxStudents: 1000,
    priceMonthly: 149,
    displayOrder: 2,
    features: { analytics: true, csvImport: true, customBranding: false },
  },
  {
    code: "pro",
    name: "Pro",
    maxStudents: 5000,
    priceMonthly: 399,
    displayOrder: 3,
    features: { analytics: true, csvImport: true, customBranding: true },
  },
  {
    code: "enterprise",
    name: "Enterprise",
    maxStudents: null,
    priceMonthly: 0,
    displayOrder: 4,
    features: {
      analytics: true,
      csvImport: true,
      customBranding: true,
      sso: true,
    },
  },
];

async function seedCatalog() {
  console.log("Seeding currencies and plans...");

  for (const currency of CURRENCIES)
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: { isActive: true },
      create: currency,
    });

  await prisma.currency.updateMany({
    where: { code: { notIn: CURRENCIES.map((currency) => currency.code) } },
    data: { isActive: false },
  });

  for (const plan of PLANS)
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: {},
      create: plan,
    });

  console.log(
    `${CURRENCIES.length} currencies and ${PLANS.length} plans seeded`,
  );
}

module.exports = { seedCatalog, CURRENCIES, PLANS };
