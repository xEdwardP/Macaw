import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

import app from "../../src/app.js";
import dbHelpers from "../helpers/db.js";
import factories from "../helpers/factories.js";

const { prisma, resetDatabase } = dbHelpers;
const {
  createInstitution,
  createUser,
  createTutor,
  createPlatformWallet,
  authHeader,
} = factories;

let institution;
let student;
let tutor;
let coordinator;
let admin;

beforeEach(async () => {
  await resetDatabase();
  await createPlatformWallet();

  institution = await createInstitution({ balance: 1000 });
  student = await createUser({
    role: "student",
    institutionId: institution.id,
    balance: 100,
  });
  tutor = await createTutor({ institutionId: institution.id, balance: 250 });
  coordinator = await createUser({
    role: "institution_admin",
    institutionId: institution.id,
  });
  admin = await createUser({ role: "platform_admin" });
});

describe("GET /api/wallet", () => {
  it("devuelve la wallet del usuario autenticado", async () => {
    const res = await request(app).get("/api/wallet").set(authHeader(student));

    expect(res.status).toBe(200);
    expect(res.body.data.balance).toBe(100);
  });

  it("requiere autenticación", async () => {
    const res = await request(app).get("/api/wallet");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/wallet/recharge", () => {
  it("solo el admin puede recargar", async () => {
    const res = await request(app)
      .post("/api/wallet/recharge")
      .set(authHeader(coordinator))
      .send({ userId: student.id, amount: 50 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("AUTH_ROLE_NOT_ALLOWED");
  });

  it("acredita el saldo y registra la transacción", async () => {
    const res = await request(app)
      .post("/api/wallet/recharge")
      .set(authHeader(admin))
      .send({ userId: student.id, amount: 50 });

    expect(res.status).toBe(200);
    expect(res.body.data.balance).toBe(150);

    const tx = await prisma.transaction.findFirst({
      where: { type: "recharge" },
    });
    expect(Number(tx.amount)).toBe(50);
  });

  it("rechaza montos negativos con 422", async () => {
    const res = await request(app)
      .post("/api/wallet/recharge")
      .set(authHeader(admin))
      .send({ userId: student.id, amount: -20 });

    expect(res.status).toBe(422);
  });

  it("devuelve 404 si el usuario no existe", async () => {
    const res = await request(app)
      .post("/api/wallet/recharge")
      .set(authHeader(admin))
      .send({ userId: "no-existe", amount: 20 });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("USER_NOT_FOUND");
  });
});

describe("POST /api/wallet/subsidy", () => {
  it("rechaza subsidiar a un tutor", async () => {
    const res = await request(app)
      .post("/api/wallet/subsidy")
      .set(authHeader(coordinator))
      .send({ studentId: tutor.id, amount: 50 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("USER_NOT_STUDENT");
  });

  it("rechaza si la institución no tiene saldo", async () => {
    const res = await request(app)
      .post("/api/wallet/subsidy")
      .set(authHeader(coordinator))
      .send({ studentId: student.id, amount: 5000 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INSTITUTION_INSUFFICIENT_BALANCE");
    expect(res.body.error.params.available).toBe(1000);
  });

  it("registra el subsidio y la transacción", async () => {
    const res = await request(app)
      .post("/api/wallet/subsidy")
      .set(authHeader(coordinator))
      .send({ studentId: student.id, amount: 60, reason: "beca" });

    expect(res.status).toBe(200);

    const subsidy = await prisma.subsidy.findFirst();
    expect(Number(subsidy.amount)).toBe(60);
    expect(subsidy.reason).toBe("beca");

    const tx = await prisma.transaction.findFirst({
      where: { type: "subsidy" },
    });
    expect(Number(tx.amount)).toBe(60);
  });
});

describe("GET /api/wallet/transactions", () => {
  it("devuelve solo las transacciones propias", async () => {
    await request(app)
      .post("/api/wallet/recharge")
      .set(authHeader(admin))
      .send({ userId: student.id, amount: 30 });

    const res = await request(app)
      .get("/api/wallet/transactions")
      .set(authHeader(tutor));

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);
  });

  it("filtra por tipo", async () => {
    await request(app)
      .post("/api/wallet/recharge")
      .set(authHeader(admin))
      .send({ userId: student.id, amount: 30 });

    const res = await request(app)
      .get("/api/wallet/transactions?type=recharge")
      .set(authHeader(student));

    expect(res.body.data.total).toBe(1);
  });

  it("rechaza un tipo de transacción inválido con 422", async () => {
    const res = await request(app)
      .get("/api/wallet/transactions?type=inventado")
      .set(authHeader(student));

    expect(res.status).toBe(422);
  });
});

describe("retiros", () => {
  it("el tutor solicita un retiro y se congela el saldo", async () => {
    const res = await request(app)
      .post("/api/withdrawals")
      .set(authHeader(tutor))
      .send({ amount: 100, paypalEmail: "tutor@paypal.com" });

    expect(res.status).toBe(201);

    const wallet = await prisma.wallet.findUnique({
      where: { userId: tutor.id },
    });
    expect(Number(wallet.balance)).toBe(150);
    expect(Number(wallet.frozen)).toBe(100);
  });

  it("impide dos solicitudes pendientes a la vez", async () => {
    await request(app)
      .post("/api/withdrawals")
      .set(authHeader(tutor))
      .send({ amount: 50, paypalEmail: "tutor@paypal.com" });

    const res = await request(app)
      .post("/api/withdrawals")
      .set(authHeader(tutor))
      .send({ amount: 50, paypalEmail: "tutor@paypal.com" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("WITHDRAWAL_ALREADY_PENDING");
  });

  it("rechaza retirar más de lo disponible", async () => {
    const res = await request(app)
      .post("/api/withdrawals")
      .set(authHeader(tutor))
      .send({ amount: 9999, paypalEmail: "tutor@paypal.com" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("WALLET_INSUFFICIENT_BALANCE");
  });

  it("solo un tutor puede solicitar retiros", async () => {
    const res = await request(app)
      .post("/api/withdrawals")
      .set(authHeader(student))
      .send({ amount: 10, paypalEmail: "x@paypal.com" });

    expect(res.status).toBe(403);
  });

  it("al aprobarlo se descuenta el congelado", async () => {
    const created = await request(app)
      .post("/api/withdrawals")
      .set(authHeader(tutor))
      .send({ amount: 100, paypalEmail: "tutor@paypal.com" });

    const res = await request(app)
      .put(`/api/withdrawals/${created.body.data.id}/approve`)
      .set(authHeader(admin));

    expect(res.status).toBe(200);

    const wallet = await prisma.wallet.findUnique({
      where: { userId: tutor.id },
    });
    expect(Number(wallet.balance)).toBe(150);
    expect(Number(wallet.frozen)).toBe(0);
  });

  it("al rechazarlo se devuelve el saldo", async () => {
    const created = await request(app)
      .post("/api/withdrawals")
      .set(authHeader(tutor))
      .send({ amount: 100, paypalEmail: "tutor@paypal.com" });

    const res = await request(app)
      .put(`/api/withdrawals/${created.body.data.id}/reject`)
      .set(authHeader(admin))
      .send({ notes: "datos incorrectos" });

    expect(res.status).toBe(200);

    const wallet = await prisma.wallet.findUnique({
      where: { userId: tutor.id },
    });
    expect(Number(wallet.balance)).toBe(250);
    expect(Number(wallet.frozen)).toBe(0);
  });

  it("no se puede procesar dos veces la misma solicitud", async () => {
    const created = await request(app)
      .post("/api/withdrawals")
      .set(authHeader(tutor))
      .send({ amount: 100, paypalEmail: "tutor@paypal.com" });

    await request(app)
      .put(`/api/withdrawals/${created.body.data.id}/approve`)
      .set(authHeader(admin));

    const res = await request(app)
      .put(`/api/withdrawals/${created.body.data.id}/approve`)
      .set(authHeader(admin));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("WITHDRAWAL_ALREADY_PROCESSED");
  });

  it("el tutor solo ve sus propias solicitudes", async () => {
    const otherTutor = await createTutor({
      institutionId: institution.id,
      balance: 300,
    });

    await request(app)
      .post("/api/withdrawals")
      .set(authHeader(otherTutor))
      .send({ amount: 40, paypalEmail: "otro@paypal.com" });

    const res = await request(app)
      .get("/api/withdrawals")
      .set(authHeader(tutor));

    expect(res.body.data).toHaveLength(0);
  });
});
