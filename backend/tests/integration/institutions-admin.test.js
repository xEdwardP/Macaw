import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

import app from "../../src/app.js";
import dbHelpers from "../helpers/db.js";
import factories from "../helpers/factories.js";

const { prisma, resetDatabase } = dbHelpers;
const {
  createInstitution,
  createUser,
  createPlatformWallet,
  authHeader,
} = factories;

let institution;
let coordinator;
let admin;

const uniqueDomain = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.edu`;

beforeEach(async () => {
  await resetDatabase();
  await createPlatformWallet();

  institution = await createInstitution({ type: "university" });
  coordinator = await createUser({
    role: "institution_admin",
    institutionId: institution.id,
  });
  admin = await createUser({ role: "platform_admin" });
});

describe("CRUD de instituciones", () => {
  it("crea una institución activa con dominio verificado y suscripción", async () => {
    const domain = uniqueDomain("nueva");

    const res = await request(app)
      .post("/api/institutions")
      .set(authHeader(admin))
      .send({
        name: "Universidad Nueva",
        domain,
        type: "university",
        currencyCode: "USD",
        contactEmail: "rector@nueva.edu",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("active");
    expect(res.body.data.currencyCode).toBe("USD");
    expect(res.body.data.subscription).not.toBeNull();

    const [saved] = res.body.data.domains;
    expect(saved.domain).toBe(domain);
    expect(saved.isPrimary).toBe(true);
    expect(saved.verifiedAt).not.toBeNull();
    expect(saved.verificationMethod).toBe("manual");
  });

  it("no deja crear dos instituciones con el mismo dominio", async () => {
    const res = await request(app)
      .post("/api/institutions")
      .set(authHeader(admin))
      .send({ name: "Clon", domain: institution.domain });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INSTITUTION_DOMAIN_TAKEN");
  });

  it("rechaza una moneda que no existe en el catálogo", async () => {
    const res = await request(app)
      .post("/api/institutions")
      .set(authHeader(admin))
      .send({ name: "Sin moneda", domain: uniqueDomain("sm"), currencyCode: "XXX" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("CURRENCY_NOT_FOUND");
  });

  it("no deja crear instituciones a un admin de institución", async () => {
    const res = await request(app)
      .post("/api/institutions")
      .set(authHeader(coordinator))
      .send({ name: "Intento", domain: uniqueDomain("intento") });

    expect(res.status).toBe(403);
  });

  it("filtra el listado por estado y por texto", async () => {
    await createInstitution({ status: "suspended", name: "Suspendida" });

    const res = await request(app)
      .get("/api/institutions")
      .query({ status: "suspended" })
      .set(authHeader(admin));

    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.data[0].status).toBe("suspended");
  });

  it("devuelve la configuración resuelta y las etiquetas del tipo", async () => {
    const school = await createInstitution({ type: "school" });

    const res = await request(app)
      .get(`/api/institutions/${school.id}`)
      .set(authHeader(admin));

    expect(res.status).toBe(200);
    expect(res.body.data.settings.studentSelfTopUp).toBe(false);
    expect(res.body.data.labels.unit).toBe("Nivel");
    expect(res.body.data.effectiveCommissionRate).toBe(0.1);
  });

  it("suspende y reactiva dejando el motivo registrado", async () => {
    const suspended = await request(app)
      .patch(`/api/institutions/${institution.id}/status`)
      .set(authHeader(admin))
      .send({ status: "suspended", reason: "Falta de pago" });

    expect(suspended.status).toBe(200);
    expect(suspended.body.data.status).toBe("suspended");
    expect(suspended.body.data.statusReason).toBe("Falta de pago");

    const reactivated = await request(app)
      .patch(`/api/institutions/${institution.id}/status`)
      .set(authHeader(admin))
      .send({ status: "active" });

    expect(reactivated.body.data.status).toBe("active");
  });

  it("no elimina una institución con usuarios", async () => {
    const res = await request(app)
      .delete(`/api/institutions/${institution.id}`)
      .set(authHeader(admin));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INSTITUTION_HAS_USERS");
  });

  it("elimina una institución vacía", async () => {
    const empty = await createInstitution({});

    const res = await request(app)
      .delete(`/api/institutions/${empty.id}`)
      .set(authHeader(admin));

    expect(res.status).toBe(200);
    expect(await prisma.institution.findUnique({ where: { id: empty.id } })).toBeNull();
  });
});

describe("configuración de la institución", () => {
  it("deja al admin de institución cambiar su propio perfil", async () => {
    const res = await request(app)
      .patch("/api/institutions/me")
      .set(authHeader(coordinator))
      .send({
        name: "Nombre nuevo",
        primaryColor: "#123456",
        settings: { studentSelfTopUp: false },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Nombre nuevo");
    expect(res.body.data.primaryColor).toBe("#123456");
    expect(res.body.data.settings.studentSelfTopUp).toBe(false);
  });

  it("ignora los campos que no le corresponden al admin de institución", async () => {
    await request(app)
      .patch("/api/institutions/me")
      .set(authHeader(coordinator))
      .send({ name: "Otro", currencyCode: "EUR", commissionRate: 0.5 });

    const saved = await prisma.institution.findUnique({
      where: { id: institution.id },
    });

    expect(saved.currencyCode).toBe(institution.currencyCode);
    expect(saved.commissionRate).toBeNull();
  });

  it("descarta claves de configuración desconocidas", async () => {
    await request(app)
      .patch("/api/institutions/me")
      .set(authHeader(coordinator))
      .send({ settings: { inventada: true, tutorWithdrawals: false } });

    const saved = await prisma.institution.findUnique({
      where: { id: institution.id },
    });

    expect(saved.settings).toEqual({ tutorWithdrawals: false });
  });

  it("rechaza cualquier moneda que no sea la de la plataforma", async () => {
    const fresh = await createInstitution({});

    const res = await request(app)
      .put(`/api/institutions/${fresh.id}`)
      .set(authHeader(admin))
      .send({ currencyCode: "EUR" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("CURRENCY_NOT_ACTIVE");
  });

  it("el catálogo solo ofrece la moneda de la plataforma", async () => {
    const res = await request(app).get("/api/institutions/currencies");

    expect(res.status).toBe(200);
    expect(res.body.data.map((currency) => currency.code)).toEqual(["USD"]);
  });

  it("bloquea el cambio de moneda cuando ya hay wallets emitidas", async () => {
    await prisma.currency.update({
      where: { code: "EUR" },
      data: { isActive: true },
    });
    await createUser({ role: "student", institutionId: institution.id });

    const res = await request(app)
      .put(`/api/institutions/${institution.id}`)
      .set(authHeader(admin))
      .send({ currencyCode: "EUR" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INSTITUTION_CURRENCY_LOCKED");
  });
});

describe("el autoservicio de alta ya no existe", () => {
  it("la solicitud pública responde 404", async () => {
    const res = await request(app)
      .post("/api/public/institutions/apply")
      .send({
        name: "Colegio Solicitante",
        domain: uniqueDomain("solicitante"),
        type: "college",
        contactName: "Directora",
        contactEmail: "directora@solicitante.edu",
      });

    expect(res.status).toBe(404);
  });

  it("aprobar y rechazar responden 404", async () => {
    const approve = await request(app)
      .post(`/api/institutions/${institution.id}/approve`)
      .set(authHeader(admin))
      .send({});

    const reject = await request(app)
      .post(`/api/institutions/${institution.id}/reject`)
      .set(authHeader(admin))
      .send({ reason: "cualquiera" });

    expect(approve.status).toBe(404);
    expect(reject.status).toBe(404);
  });
});

describe("alta manual de coordinadores", () => {
  const coordinatorBody = (overrides = {}) => ({
    name: "Nueva Coordinadora",
    email: "nueva.coordinadora@unicah.edu",
    password: "password123",
    institutionId: institution.id,
    ...overrides,
  });

  it("crea la cuenta ya verificada, con su wallet y en la institución indicada", async () => {
    const res = await request(app)
      .post("/api/users/coordinators")
      .set(authHeader(admin))
      .send(coordinatorBody());

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("institution_admin");
    expect(res.body.data.institution.id).toBe(institution.id);

    const created = await prisma.user.findUnique({
      where: { email: "nueva.coordinadora@unicah.edu" },
      include: { wallet: true },
    });

    expect(created.emailVerifiedAt).not.toBeNull();
    expect(created.institutionId).toBe(institution.id);
    expect(created.wallet.currency).toBe(institution.currencyCode);
  });

  it("el coordinador puede entrar con la contraseña que le asignó el admin", async () => {
    await request(app)
      .post("/api/users/coordinators")
      .set(authHeader(admin))
      .send(coordinatorBody());

    const res = await request(app).post("/api/auth/login").send({
      email: "nueva.coordinadora@unicah.edu",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe("institution_admin");
    expect(res.body.data.user.institutionId).toBe(institution.id);
  });

  it("no crea invitación ni correo de por medio", async () => {
    await request(app)
      .post("/api/users/coordinators")
      .set(authHeader(admin))
      .send(coordinatorBody());

    expect(await prisma.invitation.count()).toBe(0);
    expect(await prisma.outboxEvent.count()).toBe(0);
  });

  it("deja constancia en la auditoría de la institución", async () => {
    const res = await request(app)
      .post("/api/users/coordinators")
      .set(authHeader(admin))
      .send(coordinatorBody());

    const log = await prisma.auditLog.findFirst({
      where: { action: "user.coordinator_created" },
    });

    expect(log.institutionId).toBe(institution.id);
    expect(log.actorId).toBe(admin.id);
    expect(log.entityId).toBe(res.body.data.id);
  });

  it("rechaza un correo que ya tiene cuenta", async () => {
    const res = await request(app)
      .post("/api/users/coordinators")
      .set(authHeader(admin))
      .send(coordinatorBody({ email: coordinator.email }));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("AUTH_EMAIL_TAKEN");
  });

  it("rechaza una institución suspendida", async () => {
    await prisma.institution.update({
      where: { id: institution.id },
      data: { status: "suspended" },
    });

    const res = await request(app)
      .post("/api/users/coordinators")
      .set(authHeader(admin))
      .send(coordinatorBody());

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("INSTITUTION_SUSPENDED");
  });

  it("rechaza una institución que no existe", async () => {
    const res = await request(app)
      .post("/api/users/coordinators")
      .set(authHeader(admin))
      .send(coordinatorBody({ institutionId: "cml0000000000000000000000" }));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("INSTITUTION_NOT_FOUND");
  });

  it("exige al menos 8 caracteres de contraseña", async () => {
    const res = await request(app)
      .post("/api/users/coordinators")
      .set(authHeader(admin))
      .send(coordinatorBody({ password: "corta" }));

    expect(res.status).toBe(422);
  });

  it("solo lo puede hacer el administrador de plataforma", async () => {
    const res = await request(app)
      .post("/api/users/coordinators")
      .set(authHeader(coordinator))
      .send(coordinatorBody());

    expect(res.status).toBe(403);
  });
});

describe("plantillas de estructura académica", () => {
  it("marca como recomendada la plantilla del tipo de la institución", async () => {
    const res = await request(app)
      .get("/api/institutions/templates")
      .set(authHeader(coordinator));

    expect(res.status).toBe(200);

    const recommended = res.body.data.filter((t) => t.recommended);
    expect(recommended).toHaveLength(1);
    expect(recommended[0].code).toBe("university_hn");
  });

  it("aplica la plantilla creando unidades y grados", async () => {
    const school = await createInstitution({ type: "school" });
    const director = await createUser({
      role: "institution_admin",
      institutionId: school.id,
    });

    const res = await request(app)
      .post("/api/institutions/templates/basic_hn/apply")
      .set(authHeader(director))
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.unitsCreated).toBe(3);
    expect(res.body.data.gradeLevelsCreated).toBe(9);

    const units = await prisma.academicUnit.findMany({
      where: { institutionId: school.id },
      include: { gradeLevels: true },
    });

    expect(units).toHaveLength(3);
    expect(units.every((unit) => unit.kind === "level")).toBe(true);
    expect(units.flatMap((unit) => unit.gradeLevels)).toHaveLength(9);
  });

  it("aplicar dos veces la misma plantilla no duplica nada", async () => {
    const school = await createInstitution({ type: "school" });
    const director = await createUser({
      role: "institution_admin",
      institutionId: school.id,
    });

    await request(app)
      .post("/api/institutions/templates/basic_hn/apply")
      .set(authHeader(director))
      .send({});

    const res = await request(app)
      .post("/api/institutions/templates/basic_hn/apply")
      .set(authHeader(director))
      .send({});

    expect(res.body.data.unitsCreated).toBe(0);
    expect(res.body.data.unitsSkipped).toBe(3);
    expect(res.body.data.gradeLevelsCreated).toBe(0);

    expect(
      await prisma.academicUnit.count({ where: { institutionId: school.id } }),
    ).toBe(3);
  });

  it("responde 404 con una plantilla inexistente", async () => {
    const res = await request(app)
      .post("/api/institutions/templates/inventada/apply")
      .set(authHeader(coordinator))
      .send({});

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("TEMPLATE_NOT_FOUND");
  });
});

describe("registro de auditoría", () => {
  it("deja rastro de cada acción administrativa", async () => {
    await request(app)
      .patch(`/api/institutions/${institution.id}/status`)
      .set(authHeader(admin))
      .send({ status: "suspended", reason: "Prueba" });

    const res = await request(app)
      .get("/api/institutions/audit-logs")
      .set(authHeader(admin));

    expect(res.status).toBe(200);

    const actions = res.body.data.data.map((log) => log.action);
    expect(actions).toContain("institution.suspended");

    const [entry] = res.body.data.data.filter(
      (log) => log.action === "institution.suspended",
    );
    expect(entry.actorId).toBe(admin.id);
    expect(entry.metadata.reason).toBe("Prueba");
  });

  it("un admin de institución solo ve la auditoría de la suya", async () => {
    const other = await createInstitution({});
    await prisma.auditLog.create({
      data: { institutionId: other.id, action: "institution.updated", entity: "Institution" },
    });
    await prisma.auditLog.create({
      data: {
        institutionId: institution.id,
        action: "institution.updated",
        entity: "Institution",
      },
    });

    const res = await request(app)
      .get("/api/institutions/audit-logs")
      .set(authHeader(coordinator));

    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.data[0].institutionId).toBe(institution.id);
  });
});

describe("alias deprecado /api/universities", () => {
  it("reenvía los endpoints que conservan la forma con cabecera de deprecación", async () => {
    const res = await request(app)
      .get("/api/universities/analytics")
      .set(authHeader(coordinator));

    expect(res.status).toBe(200);
    expect(res.headers.deprecation).toBe("true");
    expect(res.headers.sunset).toBeDefined();
    expect(res.headers.link).toContain("successor-version");
  });

  it("responde 410 en los endpoints que cambiaron de forma", async () => {
    const res = await request(app)
      .get("/api/universities/faculties")
      .query({ institutionId: institution.id });

    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe("ENDPOINT_GONE");
    expect(res.body.error.params.successor).toBe("/api/institutions/units");
  });
});
