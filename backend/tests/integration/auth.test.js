import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

import app from "../../src/app.js";
import dbHelpers from "../helpers/db.js";
import factories from "../helpers/factories.js";

const { prisma, resetDatabase } = dbHelpers;
const { createInstitution, createUnit, createUser, DEFAULT_PASSWORD } =
  factories;

let institution;

beforeEach(async () => {
  await resetDatabase();
  institution = await createInstitution({ domain: "uni-test.edu" });
});

describe("POST /api/auth/register", () => {
  const validPayload = {
    name: "Ana Pérez",
    email: "ana@uni-test.edu",
    password: "password123",
    role: "student",
  };

  it("crea el usuario, su wallet y devuelve token", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe("ana@uni-test.edu");

    const wallet = await prisma.wallet.findUnique({
      where: { userId: res.body.data.user.id },
    });
    expect(wallet).not.toBeNull();
    expect(Number(wallet.balance)).toBe(0);
  });

  it("asocia la institución por el dominio del correo", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(validPayload);

    expect(res.body.data.user.institutionId).toBe(institution.id);
  });

  it("crea el perfil de tutor cuando el rol es tutor", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validPayload, email: "tut@uni-test.edu", role: "tutor" });

    const profile = await prisma.tutorProfile.findUnique({
      where: { userId: res.body.data.user.id },
    });
    expect(profile).not.toBeNull();
  });

  it("rechaza contraseñas de menos de 8 caracteres", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validPayload, password: "123" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rechaza roles que no sean student o tutor", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validPayload, role: "platform_admin" });

    expect(res.status).toBe(422);
  });

  it("rechaza un correo ya registrado con 409", async () => {
    await request(app).post("/api/auth/register").send(validPayload);
    const res = await request(app)
      .post("/api/auth/register")
      .send(validPayload);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("AUTH_EMAIL_TAKEN");
  });

  it("no deja usuario huérfano si el registro falla", async () => {
    const other = await createInstitution();
    const foreignUnit = await createUnit(other.id);

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        ...validPayload,
        email: `huerfano@${institution.domain}`,
        academicUnitId: foreignUnit.id,
      });

    expect(res.status).toBe(409);

    const user = await prisma.user.findUnique({
      where: { email: `huerfano@${institution.domain}` },
    });
    expect(user).toBeNull();
  });
});

describe("POST /api/auth/login", () => {
  it("devuelve token con credenciales válidas", async () => {
    const user = await createUser({ institutionId: institution.id });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: DEFAULT_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user).not.toHaveProperty("password");
  });

  it("devuelve 401 con contraseña incorrecta", async () => {
    const user = await createUser({ institutionId: institution.id });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "incorrecta" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_INVALID_CREDENTIALS");
  });

  it("devuelve 401 con un correo que no existe", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nadie@uni-test.edu", password: "password123" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_INVALID_CREDENTIALS");
  });

  it("bloquea a un usuario desactivado con 403", async () => {
    const user = await createUser({
      institutionId: institution.id,
      isActive: false,
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: DEFAULT_PASSWORD });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("AUTH_ACCOUNT_DISABLED");
  });
});

describe("GET /api/auth/profile", () => {
  it("devuelve el usuario autenticado", async () => {
    const user = await createUser({ institutionId: institution.id });
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: DEFAULT_PASSWORD });

    const res = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", `Bearer ${login.body.data.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(user.id);
  });

  it("rechaza un token inválido con 401", async () => {
    const res = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", "Bearer token-basura");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_TOKEN_INVALID");
  });
});
