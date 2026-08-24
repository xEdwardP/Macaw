const prisma = require("../../config/prisma");
const paypalService = require("../wallet/paypal.service");
const env = require("../../config/env");
const sessionMoney = require("../sessions/sessions.money");
const ledger = require("../../shared/ledger/ledger");
const accounts = require("../../shared/ledger/accounts");
const { PLATFORM_EMAIL } = require("../../config/platform");
const { money } = require("../../shared/money/money");
const {
  resolveSettings,
  labelsFor,
  defaultUnitKindFor,
} = require("../../config/institutionSettings");
const {
  BadRequestError,
  ConflictError,
  NotFoundError,
} = require("../../shared/errors/AppError");
const ERROR_CODES = require("../../shared/errors/codes");

const paginate = (page, limit) => ({
  take: parseInt(limit),
  skip: (parseInt(page) - 1) * parseInt(limit),
});

const paged = (data, total, page, limit) => ({
  data,
  total,
  page: parseInt(page),
  limit: parseInt(limit),
  totalPages: Math.ceil(total / parseInt(limit)),
});

const requireInstitution = (ctx) => {
  if (!ctx.institutionId)
    throw new BadRequestError(
      ERROR_CODES.INSTITUTION_REQUIRED,
      "El usuario no está asociado a ninguna institución. Un administrador de plataforma debe indicar la institución destino.",
    );
  return ctx.institutionId;
};

const findUnit = async (ctx, id) => {
  const unit = await ctx.db.academicUnit.findFirst({ where: { id } });
  if (!unit)
    throw new NotFoundError(
      ERROR_CODES.ACADEMIC_UNIT_NOT_FOUND,
      "Unidad académica no encontrada",
    );
  return unit;
};

const findSubject = async (ctx, id) => {
  const subject = await ctx.db.subject.findFirst({ where: { id } });
  if (!subject)
    throw new NotFoundError(ERROR_CODES.SUBJECT_NOT_FOUND, "Materia no encontrada");
  return subject;
};

const getPublicInstitutions = async () =>
  prisma.institution.findMany({
    where: { status: "active" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      domain: true,
      logo: true,
      currencyCode: true,
    },
  });

const resolveByDomain = async (value) => {
  const raw = String(value || "").toLowerCase().trim();
  const domain = raw.includes("@") ? raw.split("@")[1] : raw;

  const match = domain
    ? await prisma.institutionDomain.findUnique({
        where: { domain },
        include: {
          institution: {
            select: {
              id: true,
              name: true,
              type: true,
              status: true,
              logo: true,
              currencyCode: true,
              locale: true,
            },
          },
        },
      })
    : null;

  if (!match?.verifiedAt || match.institution.status !== "active")
    throw new NotFoundError(
      ERROR_CODES.INSTITUTION_NOT_FOUND,
      "No encontramos una institución para ese dominio de correo",
    );

  return {
    ...match.institution,
    labels: labelsFor(match.institution.type),
  };
};

const getMine = async (ctx) => {
  if (!ctx.institution)
    throw new NotFoundError(
      ERROR_CODES.INSTITUTION_NOT_FOUND,
      "No perteneces a ninguna institución",
    );

  const subscription = await prisma.subscription.findUnique({
    where: { institutionId: ctx.institutionId },
    include: { plan: true },
  });

  const currency = await prisma.currency.findUnique({
    where: { code: ctx.institution.currencyCode },
  });

  return {
    ...ctx.institution,
    settings: resolveSettings(ctx.institution),
    labels: labelsFor(ctx.institution.type),
    commissionRate: ctx.institution.commissionRate ?? env.PLATFORM_COMMISSION_RATE,
    currency,
    subscription,
  };
};

const getCurrencies = async () =>
  prisma.currency.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  });

const getPlans = async () =>
  prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  });

const getUnits = async ({ institutionId, page = 1, limit = 8 }) => {
  const where = { institutionId };

  const [data, total] = await Promise.all([
    prisma.academicUnit.findMany({
      where,
      orderBy: { name: "asc" },
      include: { _count: { select: { subjects: true } } },
      ...paginate(page, limit),
    }),
    prisma.academicUnit.count({ where }),
  ]);

  return paged(data, total, page, limit);
};

const getSubjectsByUnit = async (unitId, { page = 1, limit = 8 } = {}) => {
  const unit = await prisma.academicUnit.findUnique({ where: { id: unitId } });
  if (!unit)
    throw new NotFoundError(
      ERROR_CODES.ACADEMIC_UNIT_NOT_FOUND,
      "Unidad académica no encontrada",
    );

  const [data, total] = await Promise.all([
    prisma.unitSubject.findMany({
      where: { academicUnitId: unitId },
      include: { subject: true },
      orderBy: { subject: { termNumber: "asc" } },
      ...paginate(page, limit),
    }),
    prisma.unitSubject.count({ where: { academicUnitId: unitId } }),
  ]);

  return paged(
    data.map((link) => link.subject),
    total,
    page,
    limit,
  );
};

const getSubjects = async (
  ctx,
  { search, unitId, termNumber, general, page = 1, limit = 10 },
) => {
  const where = {};

  if (search)
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ];

  if (unitId) where.units = { some: { academicUnitId: unitId } };
  if (termNumber) where.termNumber = termNumber;
  if (general !== undefined) where.isGeneral = general;

  const [data, total] = await Promise.all([
    ctx.db.subject.findMany({
      where,
      orderBy: { name: "asc" },
      include: { units: true },
      ...paginate(page, limit),
    }),
    ctx.db.subject.count({ where }),
  ]);

  return paged(data, total, page, limit);
};

const getAnalytics = async (ctx) => {
  const db = ctx.db;

  const [
    totalStudents,
    totalTutors,
    totalSessions,
    completedSessions,
    cancelledSessions,
    totalSubsidies,
    topTutors,
    topSubjectGroups,
    recentSessions,
  ] = await Promise.all([
    db.user.count({ where: { role: "student" } }),
    db.user.count({ where: { role: "tutor" } }),
    db.session.count({}),
    db.session.count({ where: { status: "completed" } }),
    db.session.count({ where: { status: "cancelled" } }),
    db.subsidy.aggregate({ _sum: { amount: true } }),
    db.user.findMany({
      where: { role: "tutor" },
      select: {
        id: true,
        name: true,
        tutorProfile: {
          select: {
            averageRating: true,
            totalSessions: true,
            hourlyRate: true,
          },
        },
      },
      orderBy: { tutorProfile: { totalSessions: "desc" } },
      take: 5,
    }),
    db.session.groupBy({
      by: ["subjectId"],
      _count: { subjectId: true },
      orderBy: { _count: { subjectId: "desc" } },
      take: 5,
    }),
    db.session.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        student: { select: { id: true, name: true } },
        tutor: { select: { id: true, name: true } },
        subject: { select: { name: true } },
      },
    }),
  ]);

  const topSubjectDetails = await db.subject.findMany({
    where: { id: { in: topSubjectGroups.map((group) => group.subjectId) } },
  });

  const topSubjects = topSubjectGroups.map((group) => {
    const subject = topSubjectDetails.find((s) => s.id === group.subjectId);
    return { ...subject, _count: { sessions: group._count.subjectId } };
  });

  const completionRate =
    totalSessions > 0
      ? ((completedSessions / totalSessions) * 100).toFixed(1)
      : 0;

  return {
    overview: {
      totalStudents,
      totalTutors,
      totalSessions,
      completedSessions,
      cancelledSessions,
      completionRate,
      totalSubsidiesAmount: totalSubsidies._sum.amount || 0,
      institutionBalance: ctx.institution?.balance ?? 0,
      currencyCode: ctx.institution?.currencyCode ?? env.PLATFORM_BASE_CURRENCY,
    },
    topTutors,
    topSubjects,
    recentSessions,
  };
};

const getStudents = async (ctx, { search, page = 1, limit = 10 }) => {
  const where = { role: "student" };

  if (search)
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];

  const [data, total] = await Promise.all([
    ctx.db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        program: true,
        termNumber: true,
        academicScore: true,
        academicUnitId: true,
        academicUnit: { select: { id: true, name: true, code: true } },
        gradeLevel: { select: { id: true, name: true, code: true } },
        wallet: { select: { balance: true } },
        sessionsAsStudent: { select: { id: true, status: true } },
      },
      orderBy: { name: "asc" },
      ...paginate(page, limit),
    }),
    ctx.db.user.count({ where }),
  ]);

  return paged(data, total, page, limit);
};

const getSubsidies = async (ctx) =>
  ctx.db.subsidy.findMany({
    orderBy: { appliedAt: "desc" },
    include: {
      student: { select: { id: true, name: true, email: true } },
      institution: { select: { id: true, name: true } },
    },
  });

const getPlatformEarnings = async () => {
  const platform = await prisma.user.findUnique({
    where: { email: PLATFORM_EMAIL },
    include: {
      wallet: {
        include: { transactions: { orderBy: { createdAt: "desc" }, take: 20 } },
      },
    },
  });

  if (!platform?.wallet)
    throw new NotFoundError(
      ERROR_CODES.PLATFORM_WALLET_NOT_FOUND,
      "Wallet de plataforma no encontrada",
    );

  const currencyCode = platform.wallet.currency;

  const ledgerBalance = await ledger.accountBalance(
    prisma,
    accounts.userWallet(platform.id, currencyCode),
  );

  return {
    balance: ledgerBalance,
    lifetimeEarned: platform.wallet.lifetimeEarned,
    currencyCode,
    projectedBalance: platform.wallet.balance,
    transactions: platform.wallet.transactions,
  };
};

const findGradeLevel = async (ctx, id) => {
  const level = await prisma.gradeLevel.findFirst({
    where: {
      id,
      ...(ctx.isPlatformAdmin
        ? {}
        : { academicUnit: { institutionId: ctx.institutionId } }),
    },
  });

  if (!level)
    throw new NotFoundError(
      ERROR_CODES.GRADE_LEVEL_NOT_FOUND,
      "Grado no encontrado",
    );

  return level;
};

const getGradeLevels = async (ctx, unitId) => {
  await findUnit(ctx, unitId);

  return prisma.gradeLevel.findMany({
    where: { academicUnitId: unitId },
    orderBy: { orderIndex: "asc" },
  });
};

const createGradeLevel = async (ctx, unitId, { name, code, orderIndex }) => {
  await findUnit(ctx, unitId);

  const existing = await prisma.gradeLevel.findUnique({
    where: { academicUnitId_code: { academicUnitId: unitId, code } },
  });

  if (existing)
    throw new ConflictError(
      ERROR_CODES.GRADE_LEVEL_CODE_TAKEN,
      `Ya existe un grado con el código "${code}" en esta unidad`,
    );

  return prisma.gradeLevel.create({
    data: { academicUnitId: unitId, name, code, orderIndex: orderIndex ?? 0 },
  });
};

const updateGradeLevel = async (ctx, id, { name, code, orderIndex }) => {
  const level = await findGradeLevel(ctx, id);

  if (code && code !== level.code) {
    const existing = await prisma.gradeLevel.findUnique({
      where: {
        academicUnitId_code: {
          academicUnitId: level.academicUnitId,
          code,
        },
      },
    });

    if (existing)
      throw new ConflictError(
        ERROR_CODES.GRADE_LEVEL_CODE_TAKEN,
        `Ya existe un grado con el código "${code}" en esta unidad`,
      );
  }

  return prisma.gradeLevel.update({
    where: { id },
    data: { name, code, orderIndex },
  });
};

const deleteGradeLevel = async (ctx, id) => {
  await findGradeLevel(ctx, id);

  const students = await prisma.user.count({ where: { gradeLevelId: id } });

  if (students > 0)
    throw new ConflictError(
      ERROR_CODES.GRADE_LEVEL_HAS_STUDENTS,
      "No se puede eliminar: hay estudiantes asignados a este grado",
      { students },
    );

  await prisma.gradeLevel.delete({ where: { id } });

  return { id };
};

const rechargeInstitution = async ({ institutionId, amount }) => {
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
  });
  if (!institution)
    throw new NotFoundError(
      ERROR_CODES.INSTITUTION_NOT_FOUND,
      "Institución no encontrada",
    );

  return prisma.$transaction(async (tx) => {
    await sessionMoney.fundInstitution(tx, {
      institutionId,
      amount: money(amount),
      currency: institution.currencyCode,
      reason: "institution.manual_recharge",
    });

    return tx.institution.findUnique({ where: { id: institutionId } });
  });
};

const getList = async () =>
  prisma.institution.findMany({
    orderBy: { name: "asc" },
    include: {
      currency: true,
      subscription: { include: { plan: true } },
      _count: { select: { users: { where: { role: "student" } } } },
    },
  });

const createOrder = async (ctx, amount) => {
  const institutionId = requireInstitution(ctx);
  return paypalService.createInstitutionOrder(institutionId, amount);
};

const captureOrder = async (ctx, orderId) => {
  const institutionId = requireInstitution(ctx);
  return paypalService.captureInstitutionOrder(institutionId, orderId);
};

const createUnit = async (ctx, { name, code, kind }) => {
  const institutionId = requireInstitution(ctx);

  const existing = await ctx.db.academicUnit.findFirst({ where: { code } });
  if (existing)
    throw new ConflictError(
      ERROR_CODES.ACADEMIC_UNIT_CODE_TAKEN,
      `Ya existe una unidad con el código "${code}"`,
    );

  return ctx.db.academicUnit.create({
    data: {
      name,
      code,
      institutionId,
      kind: kind || defaultUnitKindFor(ctx.institution?.type),
    },
    include: { _count: { select: { subjects: true } } },
  });
};

const updateUnit = async (ctx, id, { name, code, kind }) => {
  await findUnit(ctx, id);

  return ctx.db.academicUnit.update({
    where: { id },
    data: { name, code, kind },
    include: { _count: { select: { subjects: true } } },
  });
};

const deleteUnit = async (ctx, id) => {
  await findUnit(ctx, id);
  return ctx.db.academicUnit.delete({ where: { id } });
};

const createSubject = async (
  ctx,
  { name, code, termNumber, credits, isGeneral, unitId },
) => {
  const institutionId = requireInstitution(ctx);

  if (!isGeneral) {
    if (!unitId)
      throw new BadRequestError(
        ERROR_CODES.ACADEMIC_UNIT_REQUIRED,
        "Debes seleccionar una unidad académica",
      );
    await findUnit(ctx, unitId);
  }

  const existing = await ctx.db.subject.findFirst({ where: { code } });
  if (existing)
    throw new ConflictError(
      ERROR_CODES.SUBJECT_CODE_TAKEN,
      `Ya existe una materia con el código "${code}"`,
    );

  return prisma.$transaction(async (tx) => {
    const subject = await tx.subject.create({
      data: { name, code, termNumber, credits, isGeneral, institutionId },
    });

    if (unitId && !isGeneral)
      await tx.unitSubject.create({
        data: { academicUnitId: unitId, subjectId: subject.id },
      });

    return subject;
  });
};

const updateSubject = async (
  ctx,
  id,
  { name, code, termNumber, credits, isGeneral, unitId },
) => {
  await findSubject(ctx, id);

  if (!isGeneral && unitId) await findUnit(ctx, unitId);

  if (code) {
    const existing = await ctx.db.subject.findFirst({ where: { code } });
    if (existing && existing.id !== id)
      throw new ConflictError(
        ERROR_CODES.SUBJECT_CODE_TAKEN,
        `Ya existe una materia con el código "${code}"`,
      );
  }

  return prisma.$transaction(async (tx) => {
    const subject = await tx.subject.update({
      where: { id },
      data: {
        name,
        termNumber,
        credits,
        isGeneral,
        ...(code && { code }),
      },
      include: { units: true },
    });

    if (isGeneral) {
      await tx.unitSubject.deleteMany({ where: { subjectId: id } });
    } else if (unitId) {
      await tx.unitSubject.deleteMany({ where: { subjectId: id } });
      await tx.unitSubject.create({
        data: { academicUnitId: unitId, subjectId: id },
      });
    }

    return subject;
  });
};

const deleteSubject = async (ctx, id) => {
  await findSubject(ctx, id);

  const tutorCount = await prisma.tutorSubject.count({ where: { subjectId: id } });
  if (tutorCount > 0)
    throw new ConflictError(
      ERROR_CODES.SUBJECT_HAS_TUTORS,
      "No se puede eliminar, hay tutores que imparten esta materia",
    );

  const sessionCount = await prisma.session.count({ where: { subjectId: id } });
  if (sessionCount > 0)
    throw new ConflictError(
      ERROR_CODES.SUBJECT_HAS_SESSIONS,
      "No se puede eliminar, hay sesiones asociadas a esta materia",
    );

  return prisma.$transaction(async (tx) => {
    await tx.unitSubject.deleteMany({ where: { subjectId: id } });
    return tx.subject.delete({ where: { id } });
  });
};

const assignSubjectToUnit = async (ctx, unitId, subjectId) => {
  await findUnit(ctx, unitId);
  await findSubject(ctx, subjectId);

  return prisma.unitSubject.create({
    data: { academicUnitId: unitId, subjectId },
  });
};

const removeSubjectFromUnit = async (ctx, unitId, subjectId) => {
  await findUnit(ctx, unitId);
  await findSubject(ctx, subjectId);

  return prisma.unitSubject.deleteMany({
    where: { academicUnitId: unitId, subjectId },
  });
};

module.exports = {
  getPublicInstitutions,
  resolveByDomain,
  getMine,
  getCurrencies,
  getPlans,
  getUnits,
  getSubjectsByUnit,
  getSubjects,
  getAnalytics,
  getStudents,
  getSubsidies,
  getPlatformEarnings,
  rechargeInstitution,
  getList,
  createOrder,
  captureOrder,
  createUnit,
  updateUnit,
  deleteUnit,
  createSubject,
  updateSubject,
  deleteSubject,
  assignSubjectToUnit,
  removeSubjectFromUnit,
  getGradeLevels,
  createGradeLevel,
  updateGradeLevel,
  deleteGradeLevel,
};
