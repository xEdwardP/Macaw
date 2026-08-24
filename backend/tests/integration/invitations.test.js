import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

import app from "../../src/app.js";
import dbHelpers from "../helpers/db.js";
import factories from "../helpers/factories.js";

const { prisma, resetDatabase } = dbHelpers;
const { createInstitution, createUser, createPlatformWallet, authHeader } =
  factories;

let institution;
let coordinator;

const invite = (payload, actor = coordinator) =>
  request(app)
    .post("/api/institutions/invitations")
    .set(authHeader(actor))
    .send(payload);

const tokenOf = (id) =>
  prisma.invitation.findUnique({ where: { id } }).then((row) => row.token);

beforeEach(async () => {
  await resetDatabase();
  await createPlatformWallet();

  institution = await createInstitution({ currencyCode: "HNL" });
  coordinator = await createUser({
    role: "institution_admin",
    institutionId: institution.id,
  });
});

describe("envío de invitaciones", () => {
  it("crea la invitación y encola el correo sin devolver el token", async () => {
    const res = await invite({
      email: "nueva.admin@macaw.edu",
      role: "institution_admin",
      name: "Nueva Admin",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("pending");
    expect(res.body.data.token).toBeUndefined();

    const event = await prisma.outboxEvent.findFirst({
      where: { type: "invitation_created" },
    });

    expect(event.payload.email).toBe("nueva.admin@macaw.edu");
    expect(event.payload.token).toBe(await tokenOf(res.body.data.id));
  });

  it("no envía dos invitaciones pendientes al mismo correo", async () => {
    await invite({ email: "repetida@macaw.edu" });

    const res = await invite({ email: "repetida@macaw.edu" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INVITATION_ALREADY_SENT");
  });

  it("no invita a alguien que ya pertenece a otra institución", async () => {
    const other = await createInstitution({});
    const foreign = await createUser({
      role: "student",
      institutionId: other.id,
    });

    const res = await invite({ email: foreign.email, role: "student" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("AUTH_EMAIL_TAKEN");
  });

  it("no permite invitar con el rol de administrador de plataforma", async () => {
    const res = await invite({
      email: "intruso@macaw.edu",
      role: "platform_admin",
    });

    expect(res.status).toBe(422);
  });

  it("no deja revocar la invitación de otra institución", async () => {
    const other = await createInstitution({});
    const otherAdmin = await createUser({
      role: "institution_admin",
      institutionId: other.id,
    });

    const created = await invite({ email: "ajena@macaw.edu" }, otherAdmin);

    const res = await request(app)
      .delete(`/api/institutions/invitations/${created.body.data.id}`)
      .set(authHeader(coordinator));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("INVITATION_NOT_FOUND");
  });
});

describe("invitar a alguien que ya tiene cuenta", () => {
  it("no permite invitar a un miembro activo de la propia institución", async () => {
    const tutor = await createUser({
      role: "tutor",
      institutionId: institution.id,
    });

    const res = await invite({
      email: tutor.email,
      role: "tutor",
      name: "Suplantado",
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("TUTOR_ALREADY_HAS_ACCOUNT");
  });

  it("no reescribe la contraseña de una cuenta activa al aceptar", async () => {
    const created = await invite({
      email: "por.invitar@macaw.edu",
      role: "tutor",
      name: "Por Invitar",
    });

    const token = await tokenOf(created.body.data.id);

    const victim = await createUser({
      role: "tutor",
      institutionId: institution.id,
      email: "por.invitar@macaw.edu",
    });

    const res = await request(app)
      .post("/api/auth/invitations/accept")
      .send({ token, name: "Suplantador", password: "suplantada123" });

    expect(res.status).toBe(409);

    const unchanged = await prisma.user.findUnique({
      where: { id: victim.id },
    });
    expect(unchanged.password).toBe(victim.password);
  });
});

describe("consulta pública de una invitación", () => {
  it("describe la invitación a quien tiene el enlace", async () => {
    const created = await invite({
      email: "consulta@macaw.edu",
      role: "tutor",
    });

    const res = await request(app).get(
      `/api/auth/invitations/${await tokenOf(created.body.data.id)}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("consulta@macaw.edu");
    expect(res.body.data.role).toBe("tutor");
    expect(res.body.data.institution.name).toBe(institution.name);
  });

  it("responde 404 con un token inexistente", async () => {
    const res = await request(app).get("/api/auth/invitations/token-inventado");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("INVITATION_NOT_FOUND");
  });
});

describe("aceptación de invitaciones", () => {
  const accept = (token, overrides = {}) =>
    request(app)
      .post("/api/auth/invitations/accept")
      .send({ token, name: "Persona Invitada", password: "password123", ...overrides });

  it("crea la cuenta, la wallet en la moneda de la institución y autentica", async () => {
    const created = await invite({ email: "admin.nueva@macaw.edu" });
    const token = await tokenOf(created.body.data.id);

    const res = await accept(token);

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe("institution_admin");
    expect(res.body.data.user.institutionId).toBe(institution.id);
    expect(res.body.data.user.password).toBeUndefined();

    const wallet = await prisma.wallet.findUnique({
      where: { userId: res.body.data.user.id },
    });
    expect(wallet.currency).toBe("HNL");

    const profile = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", `Bearer ${res.body.data.token}`);

    expect(profile.status).toBe(200);
    expect(profile.body.data.email).toBe("admin.nueva@macaw.edu");
  });

  it("permite iniciar sesión con la contraseña elegida", async () => {
    const created = await invite({ email: "login@macaw.edu" });
    await accept(await tokenOf(created.body.data.id));

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@macaw.edu", password: "password123" });

    expect(res.status).toBe(200);
  });

  it("crea el perfil de tutor cuando el rol invitado es tutor", async () => {
    const created = await invite({ email: "tutor@macaw.edu", role: "tutor" });

    const res = await accept(await tokenOf(created.body.data.id));

    const profile = await prisma.tutorProfile.findUnique({
      where: { userId: res.body.data.user.id },
    });

    expect(profile).not.toBeNull();
  });

  it("cuenta al estudiante invitado en la suscripción", async () => {
    const withPlan = await createInstitution({
      plan: { maxStudents: 10 },
    });
    const director = await createUser({
      role: "institution_admin",
      institutionId: withPlan.id,
    });

    const created = await invite(
      { email: "estudiante@macaw.edu", role: "student" },
      director,
    );

    await accept(await tokenOf(created.body.data.id));

    const subscription = await prisma.subscription.findUnique({
      where: { institutionId: withPlan.id },
    });

    expect(subscription.currentStudents).toBe(1);
  });

  it("no acepta dos veces la misma invitación", async () => {
    const created = await invite({ email: "unavez@macaw.edu" });
    const token = await tokenOf(created.body.data.id);

    await accept(token);
    const res = await accept(token);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INVITATION_NOT_PENDING");
  });

  it("rechaza una invitación expirada y la marca como tal", async () => {
    const created = await invite({ email: "vencida@macaw.edu" });

    await prisma.invitation.update({
      where: { id: created.body.data.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await accept(await tokenOf(created.body.data.id));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INVITATION_EXPIRED");

    const saved = await prisma.invitation.findUnique({
      where: { id: created.body.data.id },
    });
    expect(saved.status).toBe("expired");
  });

  it("rechaza una invitación revocada", async () => {
    const created = await invite({ email: "revocada@macaw.edu" });
    const token = await tokenOf(created.body.data.id);

    await request(app)
      .delete(`/api/institutions/invitations/${created.body.data.id}`)
      .set(authHeader(coordinator));

    const res = await accept(token);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INVITATION_NOT_PENDING");
  });

  it("no deja entrar a una institución suspendida", async () => {
    const created = await invite({ email: "suspendida@macaw.edu" });
    const token = await tokenOf(created.body.data.id);

    await prisma.institution.update({
      where: { id: institution.id },
      data: { status: "suspended" },
    });

    const res = await accept(token);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("INSTITUTION_SUSPENDED");
  });

  it("al reenviar invalida el token anterior", async () => {
    const created = await invite({ email: "reenvio@macaw.edu" });
    const original = await tokenOf(created.body.data.id);

    await request(app)
      .post(`/api/institutions/invitations/${created.body.data.id}/resend`)
      .set(authHeader(coordinator));

    const renewed = await tokenOf(created.body.data.id);

    expect(renewed).not.toBe(original);
    expect((await accept(original)).status).toBe(404);
    expect((await accept(renewed)).status).toBe(200);
  });
});

describe("listado de invitaciones", () => {
  it("filtra por estado y nunca devuelve el token", async () => {
    const pending = await invite({ email: "pendiente@macaw.edu" });
    const revoked = await invite({ email: "revocada2@macaw.edu" });

    await request(app)
      .delete(`/api/institutions/invitations/${revoked.body.data.id}`)
      .set(authHeader(coordinator));

    const res = await request(app)
      .get("/api/institutions/invitations")
      .query({ status: "pending" })
      .set(authHeader(coordinator));

    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.data[0].id).toBe(pending.body.data.id);
    expect(res.body.data.data[0].token).toBeUndefined();
  });
});
