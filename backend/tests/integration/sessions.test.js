import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import request from "supertest";

import app from "../../src/app.js";
import dbHelpers from "../helpers/db.js";
import factories from "../helpers/factories.js";

const { prisma, resetDatabase } = dbHelpers;
const {
  createInstitution,
  createUnit,
  createSubject,
  createUser,
  createTutor,
  createPlatformWallet,
  authHeader,
  nextDateFor,
} = factories;

const COMMISSION_RATE = 0.1;
const HOURLY_RATE = 10;

let institution;
let unit;
let subject;
let student;
let tutor;
let admin;
let platform;

const bookSession = (overrides = {}) =>
  request(app)
    .post("/api/sessions")
    .set(authHeader(student))
    .send({
      tutorId: tutor.id,
      subjectId: subject.id,
      date: nextDateFor(1, 2),
      startTime: "10:00",
      endTime: "11:00",
      ...overrides,
    });

const platformBalance = async () => {
  const wallet = await prisma.wallet.findUnique({
    where: { userId: platform.id },
  });
  return wallet.balance;
};

beforeAll(async () => {
  await resetDatabase();
});

beforeEach(async () => {
  await resetDatabase();

  platform = await createPlatformWallet();
  institution = await createInstitution();
  unit = await createUnit(institution.id);
  subject = await createSubject(institution.id, unit.id);

  student = await createUser({
    role: "student",
    institutionId: institution.id,
    academicUnitId: unit.id,
    balance: 500,
  });

  tutor = await createTutor({
    institutionId: institution.id,
    academicUnitId: unit.id,
    subjectId: subject.id,
    hourlyRate: HOURLY_RATE,
  });

  admin = await createUser({ role: "platform_admin" });
});

describe("POST /api/sessions", () => {
  it("crea la sesión y congela el saldo del estudiante", async () => {
    const res = await bookSession();

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("pending");
    expect(res.body.data.price).toBe(HOURLY_RATE);

    const wallet = await prisma.wallet.findUnique({
      where: { userId: student.id },
    });
    expect(Number(wallet.balance)).toBe(500 - HOURLY_RATE);
    expect(Number(wallet.frozen)).toBe(HOURLY_RATE);
  });

  it("rechaza una segunda reserva del mismo tutor a la misma hora", async () => {
    await bookSession({ startTime: "10:00", endTime: "11:00" });
    const res = await bookSession({ startTime: "10:30", endTime: "11:30" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("SESSION_TUTOR_SLOT_TAKEN");
  });

  it("rechaza que el estudiante reserve dos tutores a la vez", async () => {
    const otherTutor = await createTutor({
      institutionId: institution.id,
      subjectId: subject.id,
      hourlyRate: HOURLY_RATE,
    });

    await bookSession({ startTime: "10:00", endTime: "11:00" });

    const res = await request(app)
      .post("/api/sessions")
      .set(authHeader(student))
      .send({
        tutorId: otherTutor.id,
        subjectId: subject.id,
        date: nextDateFor(1, 2),
        startTime: "10:30",
        endTime: "11:30",
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("SESSION_STUDENT_SLOT_TAKEN");
  });

  it("detecta el solapamiento aunque haya varias sesiones ese día", async () => {
    const otherStudent = await createUser({
      role: "student",
      institutionId: institution.id,
      balance: 500,
    });

    await bookSession({ startTime: "08:00", endTime: "09:00" });
    await bookSession({ startTime: "12:00", endTime: "13:00" });
    await bookSession({ startTime: "16:00", endTime: "17:00" });

    const res = await request(app)
      .post("/api/sessions")
      .set(authHeader(otherStudent))
      .send({
        tutorId: tutor.id,
        subjectId: subject.id,
        date: nextDateFor(1, 2),
        startTime: "12:30",
        endTime: "13:30",
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("SESSION_TUTOR_SLOT_TAKEN");
  });

  it("rechaza si el saldo es insuficiente", async () => {
    const broke = await createUser({
      role: "student",
      institutionId: institution.id,
      balance: 1,
    });

    const res = await request(app)
      .post("/api/sessions")
      .set(authHeader(broke))
      .send({
        tutorId: tutor.id,
        subjectId: subject.id,
        date: nextDateFor(1, 2),
        startTime: "10:00",
        endTime: "11:00",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("WALLET_INSUFFICIENT_BALANCE");
  });

  it("rechaza materias que el tutor no imparte", async () => {
    const otherSubject = await createSubject(institution.id, unit.id);
    const res = await bookSession({ subjectId: otherSubject.id });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("TUTOR_DOES_NOT_TEACH_SUBJECT");
  });

  it("rechaza horarios fuera de la disponibilidad", async () => {
    const res = await bookSession({ startTime: "22:00", endTime: "23:00" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("TUTOR_SLOT_OUTSIDE_AVAILABILITY");
  });

  it("rechaza fechas pasadas", async () => {
    const res = await bookSession({ date: "2020-01-06" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("SESSION_IN_THE_PAST");
  });

  it("rechaza un rango horario invertido con 422", async () => {
    const res = await bookSession({ startTime: "12:00", endTime: "10:00" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("ciclo de vida de la sesión", () => {
  it("no deja cancelar una sesión que el tutor ya impartió", async () => {
    const booking = await bookSession();
    const sessionId = booking.body.data.id;

    await request(app)
      .put(`/api/sessions/${sessionId}/confirm`)
      .set(authHeader(tutor));
    await request(app)
      .put(`/api/sessions/${sessionId}/complete`)
      .set(authHeader(tutor));

    const res = await request(app)
      .put(`/api/sessions/${sessionId}/cancel`)
      .set(authHeader(student));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("SESSION_NOT_CANCELLABLE");

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });
    expect(session.status).toBe("pending_confirmation");

    const studentWallet = await prisma.wallet.findUnique({
      where: { userId: student.id },
    });
    expect(Number(studentWallet.frozen)).toBeCloseTo(HOURLY_RATE, 2);
  });

  it("una segunda confirmación del estudiante no vuelve a pagar al tutor", async () => {
    const booking = await bookSession();
    const sessionId = booking.body.data.id;

    await request(app)
      .put(`/api/sessions/${sessionId}/confirm`)
      .set(authHeader(tutor));
    await request(app)
      .put(`/api/sessions/${sessionId}/complete`)
      .set(authHeader(tutor));
    await request(app)
      .put(`/api/sessions/${sessionId}/student-confirm`)
      .set(authHeader(student));

    const tutorWalletAfterFirst = await prisma.wallet.findUnique({
      where: { userId: tutor.id },
    });

    const res = await request(app)
      .put(`/api/sessions/${sessionId}/student-confirm`)
      .set(authHeader(student));

    expect(res.status).toBe(409);

    const tutorWallet = await prisma.wallet.findUnique({
      where: { userId: tutor.id },
    });
    expect(Number(tutorWallet.balance)).toBeCloseTo(
      Number(tutorWalletAfterFirst.balance),
      2,
    );
  });

  it("libera el pago al tutor y acredita la comisión a plataforma", async () => {
    const booking = await bookSession();
    const sessionId = booking.body.data.id;
    const before = await platformBalance();

    await request(app)
      .put(`/api/sessions/${sessionId}/confirm`)
      .set(authHeader(tutor));
    await request(app)
      .put(`/api/sessions/${sessionId}/complete`)
      .set(authHeader(tutor));

    const res = await request(app)
      .put(`/api/sessions/${sessionId}/student-confirm`)
      .set(authHeader(student));

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("completed");

    const commission = HOURLY_RATE * COMMISSION_RATE;
    expect(await platformBalance()).toBeCloseTo(before + commission, 2);

    const tutorWallet = await prisma.wallet.findUnique({
      where: { userId: tutor.id },
    });
    expect(Number(tutorWallet.balance)).toBeCloseTo(HOURLY_RATE - commission, 2);

    const studentWallet = await prisma.wallet.findUnique({
      where: { userId: student.id },
    });
    expect(Number(studentWallet.frozen)).toBe(0);
  });

  it("acredita la comisión al resolver una disputa a favor del tutor", async () => {
    const booking = await bookSession();
    const sessionId = booking.body.data.id;

    await request(app)
      .put(`/api/sessions/${sessionId}/confirm`)
      .set(authHeader(tutor));
    await request(app)
      .put(`/api/sessions/${sessionId}/complete`)
      .set(authHeader(tutor));
    await request(app)
      .put(`/api/sessions/${sessionId}/dispute`)
      .set(authHeader(student))
      .send({ reason: "el tutor no se conectó" });

    const before = await platformBalance();

    const res = await request(app)
      .put(`/api/sessions/${sessionId}/resolve`)
      .set(authHeader(admin))
      .send({ favorOf: "tutor" });

    expect(res.status).toBe(200);

    const commission = HOURLY_RATE * COMMISSION_RATE;
    expect(await platformBalance()).toBeCloseTo(before + commission, 2);

    const commissionTx = await prisma.transaction.findFirst({
      where: { sessionId, type: "commission" },
    });
    expect(commissionTx).not.toBeNull();
    expect(Number(commissionTx.amount)).toBeCloseTo(commission, 2);
  });

  it("devuelve el 100% al cancelar con más de 24 horas de antelación", async () => {
    const booking = await bookSession();
    const sessionId = booking.body.data.id;

    await request(app)
      .put(`/api/sessions/${sessionId}/confirm`)
      .set(authHeader(tutor));

    const res = await request(app)
      .put(`/api/sessions/${sessionId}/cancel`)
      .set(authHeader(student));

    expect(res.status).toBe(200);

    const wallet = await prisma.wallet.findUnique({
      where: { userId: student.id },
    });
    expect(Number(wallet.balance)).toBe(500);
    expect(Number(wallet.frozen)).toBe(0);
  });

  it("resuelve la disputa a favor del estudiante devolviendo el importe", async () => {
    const booking = await bookSession();
    const sessionId = booking.body.data.id;

    await request(app)
      .put(`/api/sessions/${sessionId}/confirm`)
      .set(authHeader(tutor));
    await request(app)
      .put(`/api/sessions/${sessionId}/complete`)
      .set(authHeader(tutor));
    await request(app)
      .put(`/api/sessions/${sessionId}/dispute`)
      .set(authHeader(student))
      .send({ reason: "no se impartió la sesión" });

    const res = await request(app)
      .put(`/api/sessions/${sessionId}/resolve`)
      .set(authHeader(admin))
      .send({ favorOf: "student" });

    expect(res.status).toBe(200);

    const wallet = await prisma.wallet.findUnique({
      where: { userId: student.id },
    });
    expect(Number(wallet.balance)).toBe(500);
    expect(Number(wallet.frozen)).toBe(0);
  });

  it("impide que un tutor confirme la sesión de otro", async () => {
    const booking = await bookSession();
    const otherTutor = await createTutor({ institutionId: institution.id });

    const res = await request(app)
      .put(`/api/sessions/${booking.body.data.id}/confirm`)
      .set(authHeader(otherTutor));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("SESSION_ACCESS_DENIED");
  });

  it("impide completar una sesión que no está confirmada", async () => {
    const booking = await bookSession();

    const res = await request(app)
      .put(`/api/sessions/${booking.body.data.id}/complete`)
      .set(authHeader(tutor));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("SESSION_NOT_CONFIRMED");
  });
});
