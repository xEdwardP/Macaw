const prisma = require("../../config/prisma");
const outbox = require("../../shared/events/outbox");
const audit = require("../../shared/audit/audit");
const {
  BadRequestError,
  ConflictError,
  NotFoundError,
} = require("../../shared/errors/AppError");
const ERROR_CODES = require("../../shared/errors/codes");

const WARNING_THRESHOLDS = [0.8, 1];

const countStudents = (client, institutionId) =>
  client.user.count({
    where: { institutionId, role: "student", isActive: true },
  });

const registerStudent = async (client, institutionId, addedCount = 1) => {
  const subscription = await client.subscription.findUnique({
    where: { institutionId },
    include: { plan: true, institution: { select: { name: true } } },
  });

  if (!subscription) return null;

  const students = await countStudents(client, institutionId);

  await client.subscription.update({
    where: { institutionId },
    data: { currentStudents: students },
  });

  const max = subscription.plan.maxStudents;
  if (!max) return students;

  for (const threshold of WARNING_THRESHOLDS) {
    const limit = Math.ceil(max * threshold);

    if (students - addedCount < limit && students >= limit)
      await outbox.publish(client, "plan_usage_warning", {
        institutionId,
        institutionName: subscription.institution.name,
        planName: subscription.plan.name,
        students,
        maxStudents: max,
        threshold,
      });
  }

  return students;
};

const listPlans = ({ includeInactive } = {}) =>
  prisma.plan.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { displayOrder: "asc" },
    include: { _count: { select: { subscriptions: true } } },
  });

const findPlan = async (id) => {
  const plan = await prisma.plan.findUnique({ where: { id } });

  if (!plan)
    throw new NotFoundError(ERROR_CODES.PLAN_NOT_FOUND, "Plan no encontrado");

  return plan;
};

const createPlan = async (ctx, data) => {
  const existing = await prisma.plan.findUnique({ where: { code: data.code } });

  if (existing)
    throw new ConflictError(
      ERROR_CODES.PLAN_CODE_TAKEN,
      `Ya existe un plan con el código "${data.code}"`,
    );

  const plan = await prisma.plan.create({ data });

  await audit.record(prisma, {
    actorId: audit.actorOf(ctx),
    action: "plan.created",
    entity: "Plan",
    entityId: plan.id,
    metadata: { code: plan.code },
  });

  return plan;
};

const updatePlan = async (ctx, id, data) => {
  await findPlan(id);

  if (data.code) {
    const existing = await prisma.plan.findUnique({ where: { code: data.code } });
    if (existing && existing.id !== id)
      throw new ConflictError(
        ERROR_CODES.PLAN_CODE_TAKEN,
        `Ya existe un plan con el código "${data.code}"`,
      );
  }

  const plan = await prisma.plan.update({ where: { id }, data });

  await audit.record(prisma, {
    actorId: audit.actorOf(ctx),
    action: "plan.updated",
    entity: "Plan",
    entityId: id,
    metadata: { fields: Object.keys(data) },
  });

  return plan;
};

const deletePlan = async (ctx, id) => {
  await findPlan(id);

  const inUse = await prisma.subscription.count({ where: { planId: id } });

  if (inUse > 0)
    throw new ConflictError(
      ERROR_CODES.PLAN_IN_USE,
      "Hay instituciones suscritas a este plan. Desactívalo en su lugar.",
      { subscriptions: inUse },
    );

  await prisma.plan.delete({ where: { id } });

  await audit.record(prisma, {
    actorId: audit.actorOf(ctx),
    action: "plan.deleted",
    entity: "Plan",
    entityId: id,
  });

  return { id };
};

const targetInstitution = (ctx, institutionId) => {
  const id = ctx.isPlatformAdmin
    ? institutionId || ctx.institutionId
    : ctx.institutionId;

  if (!id)
    throw new BadRequestError(
      ERROR_CODES.INSTITUTION_REQUIRED,
      "Indica la institución",
    );

  return id;
};

const usage = async (ctx, institutionId) => {
  const id = targetInstitution(ctx, institutionId);

  const subscription = await prisma.subscription.findUnique({
    where: { institutionId: id },
    include: { plan: true },
  });

  if (!subscription)
    throw new NotFoundError(
      ERROR_CODES.SUBSCRIPTION_NOT_FOUND,
      "Esta institución no tiene una suscripción activa",
    );

  const students = await countStudents(prisma, id);
  const max = subscription.plan.maxStudents;

  return {
    subscription,
    plan: subscription.plan,
    students,
    maxStudents: max,
    remaining: max === null ? null : Math.max(max - students, 0),
    occupancy: max === null ? null : Number((students / max).toFixed(4)),
  };
};

const assignPlan = async (ctx, institutionId, { planCode, status, renewsAt }) => {
  const id = targetInstitution(ctx, institutionId);

  const institution = await prisma.institution.findUnique({ where: { id } });

  if (!institution)
    throw new NotFoundError(
      ERROR_CODES.INSTITUTION_NOT_FOUND,
      "Institución no encontrada",
    );

  const plan = await prisma.plan.findUnique({ where: { code: planCode } });

  if (!plan)
    throw new NotFoundError(
      ERROR_CODES.PLAN_NOT_FOUND,
      `El plan ${planCode} no existe`,
    );

  const students = await countStudents(prisma, id);

  if (plan.maxStudents !== null && students > plan.maxStudents)
    throw new ConflictError(
      ERROR_CODES.PLAN_TOO_SMALL,
      `La institución tiene ${students} estudiantes activos y el plan admite ${plan.maxStudents}`,
      { students, maxStudents: plan.maxStudents },
    );

  const subscription = await prisma.$transaction(async (tx) => {
    const saved = await tx.subscription.upsert({
      where: { institutionId: id },
      update: {
        planId: plan.id,
        currentStudents: students,
        ...(status ? { status } : {}),
        ...(renewsAt ? { renewsAt } : {}),
      },
      create: {
        institutionId: id,
        planId: plan.id,
        currentStudents: students,
        status: status || "active",
        ...(renewsAt ? { renewsAt } : {}),
      },
      include: { plan: true },
    });

    await audit.record(tx, {
      institutionId: id,
      actorId: audit.actorOf(ctx),
      action: "subscription.plan_changed",
      entity: "Subscription",
      entityId: saved.id,
      metadata: { planCode, status: saved.status },
    });

    return saved;
  });

  return subscription;
};

const cancel = async (ctx, institutionId) => {
  const id = targetInstitution(ctx, institutionId);

  const subscription = await prisma.subscription.findUnique({
    where: { institutionId: id },
  });

  if (!subscription)
    throw new NotFoundError(
      ERROR_CODES.SUBSCRIPTION_NOT_FOUND,
      "Esta institución no tiene una suscripción",
    );

  return prisma.$transaction(async (tx) => {
    const saved = await tx.subscription.update({
      where: { institutionId: id },
      data: { status: "cancelled", cancelledAt: new Date() },
      include: { plan: true },
    });

    await audit.record(tx, {
      institutionId: id,
      actorId: audit.actorOf(ctx),
      action: "subscription.cancelled",
      entity: "Subscription",
      entityId: saved.id,
    });

    return saved;
  });
};

const recountStudents = async () => {
  const subscriptions = await prisma.subscription.findMany({
    select: { institutionId: true, currentStudents: true },
  });

  let corrected = 0;

  for (const subscription of subscriptions) {
    const students = await countStudents(prisma, subscription.institutionId);

    if (students === subscription.currentStudents) continue;

    await prisma.subscription.update({
      where: { institutionId: subscription.institutionId },
      data: { currentStudents: students },
    });

    corrected += 1;
  }

  return { checked: subscriptions.length, corrected };
};

module.exports = {
  registerStudent,
  countStudents,
  listPlans,
  createPlan,
  updatePlan,
  deletePlan,
  usage,
  assignPlan,
  cancel,
  recountStudents,
  WARNING_THRESHOLDS,
};
