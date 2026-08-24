const bcrypt = require("bcryptjs");
const prisma = require("../../src/config/prisma");
const { sign } = require("../../src/utils/jwt");
const ledger = require("../../src/shared/ledger/ledger");
const accounts = require("../../src/shared/ledger/accounts");

const OPENING = { kind: "opening_balance" };

const openBalance = (client, account, amount, currency) =>
  ledger.postEntry(client, {
    reason: "test.opening_balance",
    currency,
    legs: [
      { account: { ...OPENING, currency }, direction: ledger.DEBIT, amount },
      { account, direction: ledger.CREDIT, amount },
    ],
  });

const DEFAULT_PASSWORD = "password123";

let counter = 0;
const unique = (prefix) => `${prefix}-${Date.now()}-${++counter}`;

const createInstitution = async ({ domain, plan, ...overrides } = {}) => {
  const slug = unique("inst");
  const resolvedDomain = domain || `${slug}.edu`;

  const institution = await prisma.institution.create({
    data: {
      name: `Institución ${slug}`,
      domain: resolvedDomain,
      ...overrides,
      balance: 0,
    },
  });

  if (Number(overrides.balance || 0) > 0) {
    await openBalance(
      prisma,
      accounts.institutionFunds(institution.id, institution.currencyCode),
      overrides.balance,
      institution.currencyCode,
    );
    Object.assign(
      institution,
      await prisma.institution.findUnique({ where: { id: institution.id } }),
    );
  }

  await prisma.institutionDomain.create({
    data: {
      institutionId: institution.id,
      domain: resolvedDomain,
      isPrimary: true,
      verifiedAt: new Date(),
    },
  });

  if (plan) {
    const code = plan.code || unique("plan");

    const record = await prisma.plan.upsert({
      where: { code },
      update: { maxStudents: plan.maxStudents ?? null },
      create: {
        code,
        name: plan.name || "Plan de prueba",
        maxStudents: plan.maxStudents ?? null,
        priceMonthly: plan.priceMonthly ?? 0,
      },
    });

    await prisma.subscription.create({
      data: {
        institutionId: institution.id,
        planId: record.id,
        status: plan.status || "active",
      },
    });
  }

  return institution;
};

const createUnit = async (institutionId, overrides = {}) =>
  prisma.academicUnit.create({
    data: {
      institutionId,
      name: `Unidad ${unique("u")}`,
      code: unique("UNIT").toUpperCase(),
      ...overrides,
    },
  });

const createSubject = async (institutionId, unitId, overrides = {}) => {
  const subject = await prisma.subject.create({
    data: {
      institutionId,
      name: `Materia ${unique("s")}`,
      code: unique("SUB").toUpperCase(),
      ...overrides,
    },
  });

  if (unitId)
    await prisma.unitSubject.create({
      data: { academicUnitId: unitId, subjectId: subject.id },
    });

  return subject;
};

const createUser = async ({
  role = "student",
  institutionId = null,
  academicUnitId = null,
  balance = 0,
  currency,
  password = DEFAULT_PASSWORD,
  ...overrides
} = {}) => {
  const institution = institutionId
    ? await prisma.institution.findUnique({
        where: { id: institutionId },
        select: { currencyCode: true },
      })
    : null;

  const walletCurrency = currency || institution?.currencyCode || "USD";

  const user = await prisma.user.create({
    data: {
      name: `Usuario ${unique("u")}`,
      email: `${unique("mail")}@test.edu`,
      password: await bcrypt.hash(password, 4),
      role,
      institutionId,
      academicUnitId,
      ...overrides,
    },
  });

  await prisma.wallet.create({
    data: { userId: user.id, balance: 0, currency: walletCurrency },
  });

  if (Number(balance) > 0)
    await openBalance(
      prisma,
      accounts.userWallet(user.id, walletCurrency),
      balance,
      walletCurrency,
    );

  return user;
};

const createTutor = async ({
  institutionId,
  academicUnitId = null,
  subjectId = null,
  hourlyRate = 10,
  membershipStatus = "verified",
  availability = [{ dayOfWeek: 1, startTime: "08:00", endTime: "18:00" }],
  ...overrides
} = {}) => {
  const user = await createUser({
    role: "tutor",
    institutionId,
    academicUnitId,
    ...overrides,
  });

  const profile = await prisma.tutorProfile.create({
    data: { userId: user.id, hourlyRate },
  });

  if (institutionId && membershipStatus)
    await prisma.tutorMembership.create({
      data: {
        tutorId: user.id,
        institutionId,
        status: membershipStatus,
        ...(membershipStatus === "verified" ? { reviewedAt: new Date() } : {}),
      },
    });

  if (subjectId)
    await prisma.tutorSubject.create({
      data: { tutorProfileId: profile.id, subjectId },
    });

  if (availability.length > 0)
    await prisma.availability.createMany({
      data: availability.map((slot) => ({
        tutorProfileId: profile.id,
        ...slot,
      })),
    });

  return { ...user, tutorProfile: profile };
};

const createPlatformWallet = async () => {
  const platform = await prisma.user.create({
    data: {
      name: "Macaw Platform",
      email: "platform@macaw.app",
      password: await bcrypt.hash("platform_secret_123", 4),
      role: "platform_admin",
    },
  });
  await prisma.wallet.create({ data: { userId: platform.id } });
  return platform;
};

const createCurrency = async (code, overrides = {}) =>
  prisma.currency.upsert({
    where: { code },
    update: {},
    create: {
      code,
      name: `Moneda ${code}`,
      symbol: code.slice(0, 1),
      ...overrides,
    },
  });

const tokenFor = (user) =>
  sign({ id: user.id, role: user.role, institutionId: user.institutionId });

const authHeader = (user) => ({ Authorization: `Bearer ${tokenFor(user)}` });

const toLocalDateString = (date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

const nextDateFor = (dayOfWeek, weeksAhead = 1) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + weeksAhead * 7);

  const target = dayOfWeek === 7 ? 0 : dayOfWeek;
  while (date.getDay() !== target) date.setDate(date.getDate() + 1);

  return toLocalDateString(date);
};

module.exports = {
  DEFAULT_PASSWORD,
  createInstitution,
  createUnit,
  createSubject,
  createUser,
  createTutor,
  createPlatformWallet,
  createCurrency,
  tokenFor,
  authHeader,
  nextDateFor,
};
