import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { createRequire } from "node:module";

import app from "../../src/app.js";
import dbHelpers from "../helpers/db.js";
import factories from "../helpers/factories.js";

const require = createRequire(import.meta.url);
const tokens = require("../../src/modules/auth/userTokens.service");
const env = require("../../src/config/env");

const { prisma, resetDatabase } = dbHelpers;
const { createInstitution, createUser, authHeader, DEFAULT_PASSWORD } =
  factories;

const tokenFromOutbox = async (type) => {
  const event = await prisma.outboxEvent.findFirst({
    where: { type },
    orderBy: { createdAt: "desc" },
  });

  return event?.payload?.token;
};

let institution;
let user;

beforeEach(async () => {
  await resetDatabase();
  institution = await createInstitution({ domain: "cuenta-test.edu" });
  user = await createUser({
    institutionId: institution.id,
    email: "persona@cuenta-test.edu",
  });
});

describe("POST /api/auth/forgot-password", () => {
  it("emite un token y publica el evento de correo", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: user.email });

    expect(res.status).toBe(200);

    const issued = await prisma.userToken.findFirst({
      where: { userId: user.id, purpose: "password_reset" },
    });
    expect(issued).not.toBeNull();
    expect(await tokenFromOutbox("password_reset_requested")).toHaveLength(64);
  });

  it("responde igual para un correo que no existe, sin filtrar cuentas", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nadie@cuenta-test.edu" });

    expect(res.status).toBe(200);
    expect(await prisma.userToken.count()).toBe(0);
  });

  it("no emite token para una cuenta desactivada", async () => {
    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: user.email });

    expect(await prisma.userToken.count()).toBe(0);
  });

  it("invalida el token anterior al pedir uno nuevo", async () => {
    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: user.email });
    const first = await tokenFromOutbox("password_reset_requested");

    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: user.email });

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: first, password: "nuevaclave123" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("TOKEN_INVALID");
  });
});

describe("POST /api/auth/reset-password", () => {
  const resetWith = async (password) => {
    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: user.email });

    return request(app)
      .post("/api/auth/reset-password")
      .send({ token: await tokenFromOutbox("password_reset_requested"), password });
  };

  it("cambia la contraseña y deja entrar con la nueva", async () => {
    expect((await resetWith("nuevaclave123")).status).toBe(200);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "nuevaclave123" });

    expect(login.status).toBe(200);
  });

  it("deja de aceptar la contraseña anterior", async () => {
    await resetWith("nuevaclave123");

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: DEFAULT_PASSWORD });

    expect(login.status).toBe(401);
  });

  it("no permite reutilizar el mismo token", async () => {
    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: user.email });
    const token = await tokenFromOutbox("password_reset_requested");

    await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "nuevaclave123" });

    const second = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "otraclave456" });

    expect(second.status).toBe(400);
    expect(second.body.error.code).toBe("TOKEN_INVALID");
  });

  it("rechaza un token caducado", async () => {
    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: user.email });

    await prisma.userToken.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({
        token: await tokenFromOutbox("password_reset_requested"),
        password: "nuevaclave123",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("TOKEN_EXPIRED");
  });

  it("guarda el token cifrado, nunca en claro", async () => {
    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: user.email });

    const plain = await tokenFromOutbox("password_reset_requested");
    const stored = await prisma.userToken.findFirst({
      where: { userId: user.id },
    });

    expect(stored.tokenHash).not.toBe(plain);
    expect(stored.tokenHash).toHaveLength(64);
  });
});

describe("PATCH /api/auth/password", () => {
  it("cambia la contraseña con la actual correcta", async () => {
    const res = await request(app)
      .patch("/api/auth/password")
      .set(authHeader(user))
      .send({ currentPassword: DEFAULT_PASSWORD, newPassword: "otraclave456" });

    expect(res.status).toBe(200);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "otraclave456" });
    expect(login.status).toBe(200);
  });

  it("rechaza una contraseña actual incorrecta", async () => {
    const res = await request(app)
      .patch("/api/auth/password")
      .set(authHeader(user))
      .send({ currentPassword: "equivocada", newPassword: "otraclave456" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("PASSWORD_INCORRECT");
  });

  it("rechaza repetir la contraseña actual", async () => {
    const res = await request(app)
      .patch("/api/auth/password")
      .set(authHeader(user))
      .send({
        currentPassword: DEFAULT_PASSWORD,
        newPassword: DEFAULT_PASSWORD,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("PASSWORD_SAME_AS_CURRENT");
  });
});

describe("verificación de correo activada", () => {
  beforeEach(() => {
    env.EMAIL_VERIFICATION_ENABLED = true;
  });

  afterEach(() => {
    env.EMAIL_VERIFICATION_ENABLED = false;
  });

  it("el registro deja la cuenta sin verificar y emite el token", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Nueva Persona",
      email: "nueva@cuenta-test.edu",
      password: "password123",
      role: "student",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.emailVerifiedAt).toBeNull();
    expect(await tokenFromOutbox("email_verification_requested")).toBeTruthy();
  });

  it("verifica el correo con el token", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Nueva Persona",
      email: "nueva@cuenta-test.edu",
      password: "password123",
      role: "student",
    });

    const res = await request(app)
      .post("/api/auth/verify-email")
      .send({ token: await tokenFromOutbox("email_verification_requested") });

    expect(res.status).toBe(200);

    const verified = await prisma.user.findUnique({
      where: { email: "nueva@cuenta-test.edu" },
    });
    expect(verified.emailVerifiedAt).not.toBeNull();
  });

  it("reenvía el correo mientras la cuenta siga sin verificar", async () => {
    const res = await request(app)
      .post("/api/auth/verify-email/resend")
      .set(authHeader(user))
      .send();

    expect(res.status).toBe(200);
    expect(await tokenFromOutbox("email_verification_requested")).toBeTruthy();
  });

  it("no reenvía si el correo ya está verificado", async () => {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    });

    const res = await request(app)
      .post("/api/auth/verify-email/resend")
      .set(authHeader(user))
      .send();

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_ALREADY_VERIFIED");
  });

  it("un token de verificación no sirve para restablecer la contraseña", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Nueva Persona",
      email: "nueva@cuenta-test.edu",
      password: "password123",
      role: "student",
    });

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({
        token: await tokenFromOutbox("email_verification_requested"),
        password: "nuevaclave123",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("TOKEN_INVALID");
  });
});

describe("verificación de correo desactivada", () => {
  beforeEach(() => {
    env.EMAIL_VERIFICATION_ENABLED = false;
  });

  it("el registro deja la cuenta verificada y no emite token ni correo", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Nueva Persona",
      email: "nueva@cuenta-test.edu",
      password: "password123",
      role: "student",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.emailVerifiedAt).not.toBeNull();

    const issued = await prisma.userToken.count({
      where: { purpose: "email_verification" },
    });
    expect(issued).toBe(0);
    expect(await tokenFromOutbox("email_verification_requested")).toBeUndefined();
  });

  it("no reenvía la verificación porque la cuenta nace verificada", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Nueva Persona",
      email: "nueva@cuenta-test.edu",
      password: "password123",
      role: "student",
    });

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "nueva@cuenta-test.edu", password: "password123" });

    const res = await request(app)
      .post("/api/auth/verify-email/resend")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send();

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_ALREADY_VERIFIED");
  });
});

describe("PATCH /api/users/me", () => {
  it("actualiza los campos del perfil", async () => {
    const res = await request(app)
      .patch("/api/users/me")
      .set(authHeader(user))
      .send({ name: "Nombre Nuevo", program: "Ingeniería", termNumber: 5 });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Nombre Nuevo");
    expect(res.body.data.termNumber).toBe(5);
  });

  it("rechaza una unidad académica de otra institución", async () => {
    const other = await createInstitution({ domain: "otra-cuenta.edu" });
    const unit = await factories.createUnit(other.id);

    const res = await request(app)
      .patch("/api/users/me")
      .set(authHeader(user))
      .send({ academicUnitId: unit.id });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("ACADEMIC_UNIT_NOT_FOUND");
  });

  it("no deja cambiar el rol ni el correo por esta vía", async () => {
    await request(app)
      .patch("/api/users/me")
      .set(authHeader(user))
      .send({ name: "Otra", role: "platform_admin", email: "hack@x.com" });

    const saved = await prisma.user.findUnique({ where: { id: user.id } });
    expect(saved.role).toBe("student");
    expect(saved.email).toBe(user.email);
  });
});

describe("caducidad de tokens", () => {
  it("purga los tokens vencidos hace más de 30 días", async () => {
    await prisma.userToken.create({
      data: {
        userId: user.id,
        purpose: "password_reset",
        tokenHash: "a".repeat(64),
        expiresAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      },
    });

    const { count } = await tokens.purgeExpired();

    expect(count).toBe(1);
    expect(await prisma.userToken.count()).toBe(0);
  });
});
