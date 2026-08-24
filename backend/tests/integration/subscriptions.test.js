import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createRequire } from "module";

import app from "../../src/app.js";
import dbHelpers from "../helpers/db.js";
import factories from "../helpers/factories.js";

const require = createRequire(import.meta.url);
const {
  runReconcileSubscriptions,
} = require("../../src/jobs/reconcileSubscriptions.js");

const { prisma, resetDatabase } = dbHelpers;
const { createInstitution, createUser, createPlatformWallet, authHeader } =
  factories;

let institution;
let coordinator;
let admin;

const registerStudent = (domain, index) =>
  request(app)
    .post("/api/auth/register")
    .send({
      name: `Estudiante ${index}`,
      email: `estudiante${index}@${domain}`,
      password: "password123",
      role: "student",
    });

const warnings = () =>
  prisma.outboxEvent.findMany({
    where: { type: "plan_usage_warning" },
    orderBy: { createdAt: "asc" },
  });

beforeEach(async () => {
  await resetDatabase();
  await createPlatformWallet();

  institution = await createInstitution({ plan: { maxStudents: 5 } });
  coordinator = await createUser({
    role: "institution_admin",
    institutionId: institution.id,
  });
  admin = await createUser({ role: "platform_admin" });
});

describe("catálogo de planes", () => {
  it("crea un plan nuevo", async () => {
    const res = await request(app)
      .post("/api/institutions/admin/plans")
      .set(authHeader(admin))
      .send({
        code: `campus-${Date.now()}`,
        name: "Campus",
        maxStudents: 2500,
        priceMonthly: 199.99,
        currencyCode: "USD",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.maxStudents).toBe(2500);
    expect(res.body.data.priceMonthly).toBe(199.99);
  });

  it("no admite dos planes con el mismo código", async () => {
    const res = await request(app)
      .post("/api/institutions/admin/plans")
      .set(authHeader(admin))
      .send({ code: "starter", name: "Repetido" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("PLAN_CODE_TAKEN");
  });

  it("no elimina un plan con instituciones suscritas", async () => {
    const subscription = await prisma.subscription.findUnique({
      where: { institutionId: institution.id },
    });

    const res = await request(app)
      .delete(`/api/institutions/admin/plans/${subscription.planId}`)
      .set(authHeader(admin));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("PLAN_IN_USE");
  });

  it("elimina un plan sin uso", async () => {
    const created = await request(app)
      .post("/api/institutions/admin/plans")
      .set(authHeader(admin))
      .send({ code: `temporal-${Date.now()}`, name: "Temporal" });

    const res = await request(app)
      .delete(`/api/institutions/admin/plans/${created.body.data.id}`)
      .set(authHeader(admin));

    expect(res.status).toBe(200);
  });

  it("no deja al admin de institución tocar los planes", async () => {
    const res = await request(app)
      .post("/api/institutions/admin/plans")
      .set(authHeader(coordinator))
      .send({ code: "propio", name: "Propio" });

    expect(res.status).toBe(403);
  });
});

describe("ocupación del plan", () => {
  it("reporta los cupos usados y los disponibles", async () => {
    await createUser({ role: "student", institutionId: institution.id });
    await createUser({ role: "student", institutionId: institution.id });

    const res = await request(app)
      .get("/api/institutions/subscription")
      .set(authHeader(coordinator));

    expect(res.status).toBe(200);
    expect(res.body.data.students).toBe(2);
    expect(res.body.data.maxStudents).toBe(5);
    expect(res.body.data.remaining).toBe(3);
    expect(res.body.data.occupancy).toBe(0.4);
  });

  it("no cuenta a los estudiantes desactivados", async () => {
    const student = await createUser({
      role: "student",
      institutionId: institution.id,
    });
    await prisma.user.update({
      where: { id: student.id },
      data: { isActive: false },
    });

    const res = await request(app)
      .get("/api/institutions/subscription")
      .set(authHeader(coordinator));

    expect(res.body.data.students).toBe(0);
  });

  it("un plan ilimitado no reporta máximo", async () => {
    const unlimited = await createInstitution({ plan: { maxStudents: null } });
    const director = await createUser({
      role: "institution_admin",
      institutionId: unlimited.id,
    });

    const res = await request(app)
      .get("/api/institutions/subscription")
      .set(authHeader(director));

    expect(res.body.data.maxStudents).toBeNull();
    expect(res.body.data.occupancy).toBeNull();
  });
});

describe("avisos de ocupación", () => {
  it("avisa al cruzar el 80% y no repite el aviso después", async () => {
    for (let index = 1; index <= 3; index += 1)
      await createUser({ role: "student", institutionId: institution.id });

    expect(await warnings()).toHaveLength(0);

    await registerStudent(institution.domain, 4);

    const afterCrossing = await warnings();
    expect(afterCrossing).toHaveLength(1);
    expect(afterCrossing[0].payload.threshold).toBe(0.8);
    expect(afterCrossing[0].payload.students).toBe(4);

    await registerStudent(institution.domain, 5);

    const afterFull = await warnings();
    expect(afterFull.filter((e) => e.payload.threshold === 0.8)).toHaveLength(1);
  });

  it("avisa al llenarse el plan", async () => {
    for (let index = 1; index <= 4; index += 1)
      await createUser({ role: "student", institutionId: institution.id });

    await registerStudent(institution.domain, 5);

    const full = (await warnings()).filter((e) => e.payload.threshold === 1);

    expect(full).toHaveLength(1);
    expect(full[0].payload.students).toBe(5);
    expect(full[0].payload.maxStudents).toBe(5);
  });

  it("rechaza el registro que supera el plan", async () => {
    for (let index = 1; index <= 5; index += 1)
      await createUser({ role: "student", institutionId: institution.id });

    const res = await registerStudent(institution.domain, 6);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("PLAN_STUDENT_LIMIT_REACHED");
  });
});

describe("cambio de plan", () => {
  it("asigna un plan mayor", async () => {
    const res = await request(app)
      .post("/api/institutions/subscription")
      .set(authHeader(admin))
      .send({ institutionId: institution.id, planCode: "enterprise" });

    expect(res.status).toBe(200);
    expect(res.body.data.plan.code).toBe("enterprise");
  });

  it("no asigna un plan más pequeño que la población actual", async () => {
    const big = await createInstitution({ plan: { maxStudents: 100 } });
    for (let index = 0; index < 3; index += 1)
      await createUser({ role: "student", institutionId: big.id });

    const small = await request(app)
      .post("/api/institutions/admin/plans")
      .set(authHeader(admin))
      .send({ code: `mini-${Date.now()}`, name: "Mini", maxStudents: 2 });

    const res = await request(app)
      .post("/api/institutions/subscription")
      .set(authHeader(admin))
      .send({ institutionId: big.id, planCode: small.body.data.code });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("PLAN_TOO_SMALL");
    expect(res.body.error.params.students).toBe(3);
  });

  it("no deja al admin de institución cambiarse el plan", async () => {
    const res = await request(app)
      .post("/api/institutions/subscription")
      .set(authHeader(coordinator))
      .send({ planCode: "enterprise" });

    expect(res.status).toBe(403);
  });

  it("cancela la suscripción dejando la fecha", async () => {
    const res = await request(app)
      .delete("/api/institutions/subscription")
      .query({ institutionId: institution.id })
      .set(authHeader(admin));

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("cancelled");
    expect(res.body.data.cancelledAt).not.toBeNull();
  });
});

describe("reconciliación nocturna del contador", () => {
  it("corrige la deriva del contador cacheado", async () => {
    await createUser({ role: "student", institutionId: institution.id });
    await createUser({ role: "student", institutionId: institution.id });

    await prisma.subscription.update({
      where: { institutionId: institution.id },
      data: { currentStudents: 47 },
    });

    const result = await runReconcileSubscriptions();

    expect(result.corrected).toBe(1);

    const subscription = await prisma.subscription.findUnique({
      where: { institutionId: institution.id },
    });
    expect(subscription.currentStudents).toBe(2);
  });

  it("no toca los contadores que ya están bien", async () => {
    await prisma.subscription.update({
      where: { institutionId: institution.id },
      data: { currentStudents: 0 },
    });

    const result = await runReconcileSubscriptions();

    expect(result.corrected).toBe(0);
  });

  it("recupera los cupos de un estudiante desactivado", async () => {
    const student = await createUser({
      role: "student",
      institutionId: institution.id,
    });

    await prisma.subscription.update({
      where: { institutionId: institution.id },
      data: { currentStudents: 1 },
    });

    await prisma.user.update({
      where: { id: student.id },
      data: { isActive: false },
    });

    await runReconcileSubscriptions();

    const subscription = await prisma.subscription.findUnique({
      where: { institutionId: institution.id },
    });
    expect(subscription.currentStudents).toBe(0);
  });
});
