const prisma = require("../../config/prisma");
const env = require("../../config/env");
const { uploadImage } = require("../../config/uploads");
const audit = require("../../shared/audit/audit");
const { findTemplate, listTemplates } = require("./templates");
const {
  BASE_SETTINGS,
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

const SETTING_KEYS = Object.keys(BASE_SETTINGS);

const sanitizeSettings = (settings) => {
  if (!settings) return undefined;

  return Object.fromEntries(
    Object.entries(settings).filter(([key]) => SETTING_KEYS.includes(key)),
  );
};

const detail = {
  currency: true,
  subscription: { include: { plan: true } },
  domains: {
    select: {
      id: true,
      domain: true,
      isPrimary: true,
      verifiedAt: true,
      verificationMethod: true,
    },
    orderBy: { isPrimary: "desc" },
  },
  _count: { select: { users: true, academicUnits: true, subjects: true } },
};

const present = (institution) => ({
  ...institution,
  settings: resolveSettings(institution),
  labels: labelsFor(institution.type),
  effectiveCommissionRate:
    institution.commissionRate ?? env.PLATFORM_COMMISSION_RATE,
});

const findById = async (id) => {
  const institution = await prisma.institution.findUnique({
    where: { id },
    include: detail,
  });

  if (!institution)
    throw new NotFoundError(
      ERROR_CODES.INSTITUTION_NOT_FOUND,
      "Institución no encontrada",
    );

  return institution;
};

const assertCurrencyUsable = async (code) => {
  const currency = await prisma.currency.findUnique({ where: { code } });

  if (!currency)
    throw new BadRequestError(
      ERROR_CODES.CURRENCY_NOT_FOUND,
      `La moneda ${code} no existe en el catálogo`,
    );

  if (!currency.isActive)
    throw new BadRequestError(
      ERROR_CODES.CURRENCY_NOT_ACTIVE,
      `La moneda ${code} no está activa`,
    );

  return currency;
};

const assertDomainAvailable = async (domain) => {
  const [institution, registered] = await Promise.all([
    prisma.institution.findUnique({ where: { domain } }),
    prisma.institutionDomain.findUnique({ where: { domain } }),
  ]);

  if (institution || registered)
    throw new ConflictError(
      ERROR_CODES.INSTITUTION_DOMAIN_TAKEN,
      `El dominio ${domain} ya está registrado`,
    );
};

const assertCurrencyChangeable = async (institutionId) => {
  const [wallets, sessions, accounts] = await Promise.all([
    prisma.wallet.count({ where: { user: { institutionId } } }),
    prisma.session.count({ where: { institutionId } }),
    prisma.ledgerAccount.count({ where: { institutionId } }),
  ]);

  if (wallets + sessions + accounts > 0)
    throw new ConflictError(
      ERROR_CODES.INSTITUTION_CURRENCY_LOCKED,
      "No se puede cambiar la moneda: ya hay wallets, sesiones o cuentas contables emitidas en la moneda actual",
      { wallets, sessions, accounts },
    );
};

const defaultPlan = async (planCode) => {
  if (planCode) {
    const plan = await prisma.plan.findUnique({ where: { code: planCode } });
    if (!plan)
      throw new NotFoundError(
        ERROR_CODES.PLAN_NOT_FOUND,
        `El plan ${planCode} no existe`,
      );
    return plan;
  }

  return prisma.plan.findFirst({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  });
};

const list = async ({ search, status, type, page = 1, limit = 20 }) => {
  const where = {
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { domain: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.institution.findMany({
      where,
      orderBy: [{ status: "asc" }, { name: "asc" }],
      take: limit,
      skip: (page - 1) * limit,
      include: {
        currency: true,
        subscription: { include: { plan: true } },
        _count: { select: { users: true } },
      },
    }),
    prisma.institution.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const getById = async (id) => present(await findById(id));

const create = async (ctx, { domain, planCode, settings, ...data }) => {
  await assertCurrencyUsable(data.currencyCode || env.PLATFORM_BASE_CURRENCY);
  await assertDomainAvailable(domain);

  const plan = await defaultPlan(planCode);

  const institution = await prisma.$transaction(async (tx) => {
    const created = await tx.institution.create({
      data: {
        ...data,
        domain,
        status: "active",
        ...(settings ? { settings: sanitizeSettings(settings) } : {}),
      },
    });

    await tx.institutionDomain.create({
      data: {
        institutionId: created.id,
        domain,
        isPrimary: true,
        verifiedAt: new Date(),
        verificationMethod: "manual",
      },
    });

    if (plan)
      await tx.subscription.create({
        data: {
          institutionId: created.id,
          planId: plan.id,
          status: "active",
        },
      });

    await audit.record(tx, {
      institutionId: created.id,
      actorId: audit.actorOf(ctx),
      action: "institution.created",
      entity: "Institution",
      entityId: created.id,
      metadata: { domain, planCode: plan?.code || null },
    });

    return created;
  });

  return getById(institution.id);
};

const update = async (ctx, id, { settings, currencyCode, ...data }) => {
  const institution = await findById(id);

  if (currencyCode && currencyCode !== institution.currencyCode) {
    await assertCurrencyUsable(currencyCode);
    await assertCurrencyChangeable(id);
  }

  await prisma.$transaction(async (tx) => {
    await tx.institution.update({
      where: { id },
      data: {
        ...data,
        ...(currencyCode ? { currencyCode } : {}),
        ...(settings
          ? {
              settings: {
                ...(institution.settings || {}),
                ...sanitizeSettings(settings),
              },
            }
          : {}),
      },
    });

    await audit.record(tx, {
      institutionId: id,
      actorId: audit.actorOf(ctx),
      action: "institution.updated",
      entity: "Institution",
      entityId: id,
      metadata: { fields: Object.keys({ ...data, settings, currencyCode }) },
    });
  });

  return getById(id);
};

const updateMine = async (ctx, data) => {
  if (!ctx.institutionId)
    throw new BadRequestError(
      ERROR_CODES.INSTITUTION_REQUIRED,
      "No perteneces a ninguna institución",
    );

  return update(ctx, ctx.institutionId, data);
};

const setLogo = async (ctx, file) => {
  if (!ctx.institutionId)
    throw new BadRequestError(
      ERROR_CODES.INSTITUTION_REQUIRED,
      "No perteneces a ninguna institución",
    );

  const logo = await uploadImage(file, {
    folder: "logos",
    publicId: ctx.institutionId,
    width: 512,
  });

  return update(ctx, ctx.institutionId, { logo });
};

const changeStatus = async (ctx, id, status, reason) => {
  const institution = await findById(id);

  if (institution.status === status) return present(institution);

  await prisma.$transaction(async (tx) => {
    await tx.institution.update({
      where: { id },
      data: { status, statusReason: reason || null },
    });

    await audit.record(tx, {
      institutionId: id,
      actorId: audit.actorOf(ctx),
      action: `institution.${status}`,
      entity: "Institution",
      entityId: id,
      metadata: { from: institution.status, reason: reason || null },
    });
  });

  return getById(id);
};

const remove = async (ctx, id) => {
  const institution = await findById(id);

  if (institution._count.users > 0)
    throw new ConflictError(
      ERROR_CODES.INSTITUTION_HAS_USERS,
      "No se puede eliminar una institución con usuarios. Suspéndela en su lugar.",
      { users: institution._count.users },
    );

  const { academicUnits, subjects } = institution._count;

  if (academicUnits + subjects > 0)
    throw new ConflictError(
      ERROR_CODES.INSTITUTION_HAS_STRUCTURE,
      "No se puede eliminar una institución con estructura académica. Borra primero sus unidades y materias.",
      { academicUnits, subjects },
    );

  const ledgerAccounts = await prisma.ledgerAccount.count({
    where: { institutionId: id },
  });

  if (ledgerAccounts > 0)
    throw new ConflictError(
      ERROR_CODES.INSTITUTION_HAS_LEDGER,
      "No se puede eliminar una institución con movimientos de dinero registrados. Suspéndela en su lugar.",
      { ledgerAccounts },
    );

  await prisma.$transaction(async (tx) => {
    await audit.record(tx, {
      actorId: audit.actorOf(ctx),
      action: "institution.deleted",
      entity: "Institution",
      entityId: id,
      metadata: { name: institution.name, domain: institution.domain },
    });

    await tx.institution.delete({ where: { id } });
  });

  return { id };
};

const templates = async (ctx, { type, institutionId } = {}) => {
  if (type) return listTemplates(type);

  const targetId = ctx.isPlatformAdmin
    ? institutionId || ctx.institutionId
    : ctx.institutionId;

  const institution = targetId ? await findById(targetId) : null;
  return listTemplates(institution?.type);
};

const applyTemplate = async (ctx, code, institutionId) => {
  const targetId = ctx.isPlatformAdmin
    ? institutionId || ctx.institutionId
    : ctx.institutionId;

  if (!targetId)
    throw new BadRequestError(
      ERROR_CODES.INSTITUTION_REQUIRED,
      "Indica la institución sobre la que aplicar la plantilla",
    );

  const template = findTemplate(code);

  if (!template)
    throw new NotFoundError(
      ERROR_CODES.TEMPLATE_NOT_FOUND,
      `La plantilla ${code} no existe`,
    );

  const institution = await findById(targetId);

  const report = await prisma.$transaction(async (tx) => {
    const units = [];

    for (const unit of template.units) {
      const existing = await tx.academicUnit.findUnique({
        where: {
          institutionId_code: { institutionId: targetId, code: unit.code },
        },
      });

      const saved =
        existing ||
        (await tx.academicUnit.create({
          data: {
            institutionId: targetId,
            name: unit.name,
            code: unit.code,
            kind: template.unitKind || defaultUnitKindFor(institution.type),
          },
        }));

      const gradeLevels = [];

      for (const level of unit.gradeLevels) {
        const existingLevel = await tx.gradeLevel.findUnique({
          where: {
            academicUnitId_code: {
              academicUnitId: saved.id,
              code: level.code,
            },
          },
        });

        if (existingLevel) {
          gradeLevels.push({ code: level.code, status: "skipped" });
          continue;
        }

        await tx.gradeLevel.create({
          data: {
            academicUnitId: saved.id,
            name: level.name,
            code: level.code,
            orderIndex: level.orderIndex,
          },
        });

        gradeLevels.push({ code: level.code, status: "created" });
      }

      units.push({
        code: unit.code,
        id: saved.id,
        status: existing ? "skipped" : "created",
        gradeLevels,
      });
    }

    await audit.record(tx, {
      institutionId: targetId,
      actorId: audit.actorOf(ctx),
      action: "institution.template_applied",
      entity: "Institution",
      entityId: targetId,
      metadata: { template: code },
    });

    return units;
  });

  return {
    template: template.code,
    unitsCreated: report.filter((unit) => unit.status === "created").length,
    unitsSkipped: report.filter((unit) => unit.status === "skipped").length,
    gradeLevelsCreated: report.reduce(
      (total, unit) =>
        total + unit.gradeLevels.filter((level) => level.status === "created").length,
      0,
    ),
    units: report,
  };
};

const auditLogs = async (ctx, { entity, institutionId, page = 1, limit = 20 }) => {
  const where = {
    ...(ctx.isPlatformAdmin
      ? institutionId
        ? { institutionId }
        : {}
      : { institutionId: ctx.institutionId }),
    ...(entity ? { entity } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};

module.exports = {
  list,
  getById,
  create,
  update,
  updateMine,
  setLogo,
  changeStatus,
  remove,
  templates,
  applyTemplate,
  auditLogs,
  sanitizeSettings,
  assertCurrencyChangeable,
};
