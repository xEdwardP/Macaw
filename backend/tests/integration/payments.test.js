import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { createRequire } from "module";

import app from "../../src/app.js";
import dbHelpers from "../helpers/db.js";
import factories from "../helpers/factories.js";
import paypalService from "../../src/modules/wallet/paypal.service.js";
import ledgerModule from "../../src/shared/ledger/ledger.js";
import accountsModule from "../../src/shared/ledger/accounts.js";
import reconcileModule from "../../src/shared/ledger/reconcile.js";
import outboxModule from "../../src/shared/events/outbox.js";

const requireCjs = createRequire(import.meta.url);
const paypalClient = requireCjs("../../src/config/paypal.js");
const dispatcher = requireCjs("../../src/jobs/outboxDispatcher.js");

const { prisma, resetDatabase } = dbHelpers;
const {
  createInstitution,
  createUser,
  createTutor,
  createPlatformWallet,
  authHeader,
} = factories;

const { accountBalance } = ledgerModule;
const accounts = accountsModule;
const { reconcile } = reconcileModule;
const { runOutboxDispatcher } = dispatcher;

let institution;
let student;
let coordinator;

const captureResponse = (amount, status = "COMPLETED", currency = "USD") => ({
  status,
  purchase_units: [
    {
      payments: {
        captures: [
          { amount: { value: String(amount), currency_code: currency } },
        ],
      },
    },
  ],
});

beforeEach(async () => {
  await resetDatabase();
  await createPlatformWallet();
  vi.restoreAllMocks();

  institution = await createInstitution({ balance: 0 });
  student = await createUser({
    role: "student",
    institutionId: institution.id,
    balance: 0,
  });
  coordinator = await createUser({
    role: "institution_admin",
    institutionId: institution.id,
  });
});

const mockPaypal = (orderId, amount, status, currency = "USD") => {
  vi.spyOn(paypalClient, "createOrder").mockResolvedValue({
    id: orderId,
    status: "CREATED",
  });
  vi.spyOn(paypalClient, "captureOrder").mockResolvedValue(
    captureResponse(amount, status, currency),
  );
};

describe("órdenes de recarga de wallet", () => {
  it("persiste la orden al crearla", async () => {
    mockPaypal("ORDER-1", 50);

    const res = await request(app)
      .post("/api/paypal/create-order")
      .set(authHeader(student))
      .send({ amount: 50 });

    expect(res.status).toBe(200);

    const order = await prisma.paymentOrder.findUnique({
      where: { providerOrderId: "ORDER-1" },
    });

    expect(order.userId).toBe(student.id);
    expect(Number(order.amount)).toBe(50);
    expect(order.status).toBe("created");
    expect(order.purpose).toBe("wallet_topup");
    expect(order.currency).toBe("USD");
    expect(paypalClient.createOrder).toHaveBeenCalledWith(50, "USD");
  });

  it("no acredita nada si PayPal cobró en otra moneda", async () => {
    mockPaypal("ORDER-FX", 50, "COMPLETED", "EUR");

    await request(app)
      .post("/api/paypal/create-order")
      .set(authHeader(student))
      .send({ amount: 50 });

    const res = await request(app)
      .post("/api/paypal/capture-order")
      .set(authHeader(student))
      .send({ orderId: "ORDER-FX" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("PAYMENT_CURRENCY_MISMATCH");

    const wallet = await prisma.wallet.findUnique({
      where: { userId: student.id },
    });
    expect(Number(wallet.balance)).toBe(0);

    const order = await prisma.paymentOrder.findUnique({
      where: { providerOrderId: "ORDER-FX" },
    });
    expect(order.status).toBe("created");
  });

  it("no acredita nada si el monto cobrado no coincide", async () => {
    mockPaypal("ORDER-DIF", 500);

    vi.spyOn(paypalClient, "createOrder").mockResolvedValue({
      id: "ORDER-DIF",
      status: "CREATED",
    });

    await request(app)
      .post("/api/paypal/create-order")
      .set(authHeader(student))
      .send({ amount: 50 });

    const res = await request(app)
      .post("/api/paypal/capture-order")
      .set(authHeader(student))
      .send({ orderId: "ORDER-DIF" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("PAYMENT_AMOUNT_MISMATCH");

    const wallet = await prisma.wallet.findUnique({
      where: { userId: student.id },
    });
    expect(Number(wallet.balance)).toBe(0);
  });

  it("acredita el saldo al capturar", async () => {
    mockPaypal("ORDER-2", 50);

    await request(app)
      .post("/api/paypal/create-order")
      .set(authHeader(student))
      .send({ amount: 50 });

    const res = await request(app)
      .post("/api/paypal/capture-order")
      .set(authHeader(student))
      .send({ orderId: "ORDER-2" });

    expect(res.status).toBe(200);
    expect(res.body.data.balance).toBe(50);
    expect(
      Number(await accountBalance(prisma, accounts.userWallet(student.id, "USD"))),
    ).toBe(50);
  });

  it("capturar dos veces la misma orden no duplica el saldo", async () => {
    mockPaypal("ORDER-3", 50);

    await request(app)
      .post("/api/paypal/create-order")
      .set(authHeader(student))
      .send({ amount: 50 });
    await request(app)
      .post("/api/paypal/capture-order")
      .set(authHeader(student))
      .send({ orderId: "ORDER-3" });

    const second = await request(app)
      .post("/api/paypal/capture-order")
      .set(authHeader(student))
      .send({ orderId: "ORDER-3" });

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("PAYMENT_ALREADY_PROCESSED");

    const wallet = await prisma.wallet.findUnique({
      where: { userId: student.id },
    });
    expect(Number(wallet.balance)).toBe(50);
  });

  it("otro usuario no puede capturar una orden ajena", async () => {
    mockPaypal("ORDER-4", 50);

    await request(app)
      .post("/api/paypal/create-order")
      .set(authHeader(student))
      .send({ amount: 50 });

    const intruder = await createUser({
      role: "student",
      institutionId: institution.id,
    });

    const res = await request(app)
      .post("/api/paypal/capture-order")
      .set(authHeader(intruder))
      .send({ orderId: "ORDER-4" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("PAYMENT_ORDER_NOT_OWNED");

    const wallet = await prisma.wallet.findUnique({
      where: { userId: intruder.id },
    });
    expect(Number(wallet.balance)).toBe(0);
  });

  it("una orden desconocida no acredita nada", async () => {
    mockPaypal("ORDER-5", 50);

    const res = await request(app)
      .post("/api/paypal/capture-order")
      .set(authHeader(student))
      .send({ orderId: "ORDER-INEXISTENTE" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("PAYMENT_ORDER_NOT_FOUND");
  });

  it("marca la orden como fallida si PayPal no la completa", async () => {
    mockPaypal("ORDER-6", 50, "DECLINED");

    await request(app)
      .post("/api/paypal/create-order")
      .set(authHeader(student))
      .send({ amount: 50 });

    const res = await request(app)
      .post("/api/paypal/capture-order")
      .set(authHeader(student))
      .send({ orderId: "ORDER-6" });

    expect(res.status).toBe(400);

    const order = await prisma.paymentOrder.findUnique({
      where: { providerOrderId: "ORDER-6" },
    });
    expect(order.status).toBe("failed");
  });
});

describe("recarga institucional", () => {
  it("acredita la bolsa de la institución y cuadra en el ledger", async () => {
    mockPaypal("ORDER-INST-1", 500);

    await request(app)
      .post("/api/institutions/create-order")
      .set(authHeader(coordinator))
      .send({ amount: 500 });

    const res = await request(app)
      .post("/api/institutions/capture-order")
      .set(authHeader(coordinator))
      .send({ orderId: "ORDER-INST-1" });

    expect(res.status).toBe(200);
    expect(res.body.data.balance).toBe(500);

    const result = await reconcile(prisma);
    expect(result.projectionMismatches).toEqual([]);
    expect(result.balanced).toBe(true);
  });

  it("capturar dos veces no duplica la bolsa", async () => {
    mockPaypal("ORDER-INST-2", 500);

    await request(app)
      .post("/api/institutions/create-order")
      .set(authHeader(coordinator))
      .send({ amount: 500 });
    await request(app)
      .post("/api/institutions/capture-order")
      .set(authHeader(coordinator))
      .send({ orderId: "ORDER-INST-2" });

    const second = await request(app)
      .post("/api/institutions/capture-order")
      .set(authHeader(coordinator))
      .send({ orderId: "ORDER-INST-2" });

    expect(second.status).toBe(409);

    const updated = await prisma.institution.findUnique({
      where: { id: institution.id },
    });
    expect(Number(updated.balance)).toBe(500);
  });
});

describe("webhook de PayPal", () => {
  it("captura una orden pendiente", async () => {
    mockPaypal("ORDER-WH-1", 20);

    await request(app)
      .post("/api/paypal/create-order")
      .set(authHeader(student))
      .send({ amount: 20 });

    const result = await paypalService.handleWebhook({
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: {
        supplementary_data: { related_ids: { order_id: "ORDER-WH-1" } },
      },
    });

    expect(result.handled).toBe(true);

    const wallet = await prisma.wallet.findUnique({
      where: { userId: student.id },
    });
    expect(Number(wallet.balance)).toBe(20);
  });

  it("ignora un evento que no conoce", async () => {
    const result = await paypalService.handleWebhook({
      event_type: "BILLING.SUBSCRIPTION.CREATED",
      resource: { id: "X" },
    });

    expect(result).toEqual({ handled: false, reason: "event_ignored" });
  });

  it("no vuelve a acreditar una orden ya capturada", async () => {
    mockPaypal("ORDER-WH-2", 20);

    await request(app)
      .post("/api/paypal/create-order")
      .set(authHeader(student))
      .send({ amount: 20 });
    await request(app)
      .post("/api/paypal/capture-order")
      .set(authHeader(student))
      .send({ orderId: "ORDER-WH-2" });

    const result = await paypalService.handleWebhook({
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: { id: "ORDER-WH-2" },
    });

    expect(result).toEqual({
      handled: false,
      reason: "order_not_capturable",
    });

    const wallet = await prisma.wallet.findUnique({
      where: { userId: student.id },
    });
    expect(Number(wallet.balance)).toBe(20);
  });
});

describe("política de recarga por institución", () => {
  it("un colegio bloquea la recarga del estudiante", async () => {
    const school = await createInstitution({ type: "school" });
    const pupil = await createUser({
      role: "student",
      institutionId: school.id,
    });
    const admin = await createUser({ role: "platform_admin" });

    const res = await request(app)
      .post("/api/wallet/recharge")
      .set(authHeader(admin))
      .send({ userId: pupil.id, amount: 50 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("WALLET_SELF_TOPUP_DISABLED");
  });

  it("un colegio bloquea también la orden de PayPal", async () => {
    mockPaypal("ORDER-SCHOOL", 50);

    const school = await createInstitution({ type: "college" });
    const pupil = await createUser({
      role: "student",
      institutionId: school.id,
    });

    const res = await request(app)
      .post("/api/paypal/create-order")
      .set(authHeader(pupil))
      .send({ amount: 50 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("WALLET_SELF_TOPUP_DISABLED");
  });

  it("el subsidio sigue funcionando cuando la recarga está bloqueada", async () => {
    const school = await createInstitution({ type: "school", balance: 500 });
    const pupil = await createUser({
      role: "student",
      institutionId: school.id,
    });
    const schoolAdmin = await createUser({
      role: "institution_admin",
      institutionId: school.id,
    });

    const res = await request(app)
      .post("/api/wallet/subsidy")
      .set(authHeader(schoolAdmin))
      .send({ studentId: pupil.id, amount: 100 });

    expect(res.status).toBe(200);
    expect(res.body.data.balance).toBe(100);
  });

  it("una universidad sigue permitiendo la recarga", async () => {
    const admin = await createUser({ role: "platform_admin" });

    const res = await request(app)
      .post("/api/wallet/recharge")
      .set(authHeader(admin))
      .send({ userId: student.id, amount: 50 });

    expect(res.status).toBe(200);
    expect(res.body.data.balance).toBe(50);
  });

  it("un colegio bloquea los retiros del tutor", async () => {
    const school = await createInstitution({ type: "school" });
    const schoolTutor = await createTutor({
      institutionId: school.id,
      balance: 100,
    });

    const res = await request(app)
      .post("/api/withdrawals")
      .set(authHeader(schoolTutor))
      .send({ amount: 50, paypalEmail: "tutor@paypal.com" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("WITHDRAWALS_DISABLED");
  });
});

describe("outbox", () => {
  it("la reserva encola el evento dentro de la transacción", async () => {
    const unit = await prisma.academicUnit.create({
      data: { institutionId: institution.id, name: "U", code: "U1" },
    });
    const subject = await prisma.subject.create({
      data: { institutionId: institution.id, name: "M", code: "M1" },
    });
    await prisma.unitSubject.create({
      data: { academicUnitId: unit.id, subjectId: subject.id },
    });

    const tutor = await createTutor({
      institutionId: institution.id,
      subjectId: subject.id,
      hourlyRate: 10,
      availability: [{ dayOfWeek: 1, startTime: "08:00", endTime: "20:00" }],
    });

    const funded = await createUser({
      role: "student",
      institutionId: institution.id,
      balance: 200,
    });

    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 14);
    while (date.getDay() !== 1) date.setDate(date.getDate() + 1);

    const res = await request(app)
      .post("/api/sessions")
      .set(authHeader(funded))
      .send({
        tutorId: tutor.id,
        subjectId: subject.id,
        date: [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, "0"),
          String(date.getDate()).padStart(2, "0"),
        ].join("-"),
        startTime: "10:00",
        endTime: "11:00",
      });

    expect(res.status).toBe(201);

    const events = await prisma.outboxEvent.findMany({
      where: { type: "session_booked" },
    });
    expect(events).toHaveLength(1);
    expect(events[0].status).toBe("pending");
  });

  it("reintenta con backoff y termina marcando el evento como fallido", async () => {
    await outboxModule.publish(prisma, "session_booked", { probe: true });

    for (let attempt = 0; attempt < outboxModule.MAX_ATTEMPTS; attempt++) {
      await prisma.outboxEvent.updateMany({
        where: { status: "pending" },
        data: { availableAt: new Date(Date.now() - 1000) },
      });

      const event = await prisma.outboxEvent.findFirst();
      await outboxModule.markFailed(event, new Error("proveedor caído"));
    }

    const event = await prisma.outboxEvent.findFirst();

    expect(event.status).toBe("failed");
    expect(event.attempts).toBe(outboxModule.MAX_ATTEMPTS);
    expect(event.lastError).toContain("proveedor caído");
  });

  it("marca como entregado lo que se despacha sin webhook configurado", async () => {
    await prisma.outboxEvent.create({
      data: {
        type: "session_booked",
        payload: { probe: true },
        availableAt: new Date(Date.now() - 60000),
      },
    });

    const result = await runOutboxDispatcher(async () => {});

    expect(result.delivered).toBe(1);
    expect(result.failed).toBe(0);

    const event = await prisma.outboxEvent.findFirst();
    expect(event.status).toBe("delivered");
    expect(event.deliveredAt).not.toBeNull();
  });

  it("marca como fallido lo que el proveedor rechaza", async () => {
    await prisma.outboxEvent.create({
      data: {
        type: "session_booked",
        payload: {},
        availableAt: new Date(Date.now() - 60000),
      },
    });

    const result = await runOutboxDispatcher(async () => {
      throw new Error("proveedor caído");
    });

    expect(result.delivered).toBe(0);
    expect(result.failed).toBe(1);

    const event = await prisma.outboxEvent.findFirst();
    expect(event.status).toBe("pending");
    expect(event.attempts).toBe(1);
    expect(event.availableAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("no reclama eventos que aún no están disponibles", async () => {
    await prisma.outboxEvent.create({
      data: {
        type: "session_booked",
        payload: {},
        availableAt: new Date(Date.now() + 60000),
      },
    });

    const claimed = await outboxModule.claimBatch();

    expect(claimed).toHaveLength(0);
  });
});
