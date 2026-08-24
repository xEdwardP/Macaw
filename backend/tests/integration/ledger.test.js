import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

import app from "../../src/app.js";
import dbHelpers from "../helpers/db.js";
import factories from "../helpers/factories.js";
import ledgerModule from "../../src/shared/ledger/ledger.js";
import accountsModule from "../../src/shared/ledger/accounts.js";
import reconcileModule from "../../src/shared/ledger/reconcile.js";
import autoConfirmModule from "../../src/jobs/autoConfirm.js";

const { prisma, resetDatabase, ledgerTotals } = dbHelpers;
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

const { postEntry, accountBalance, DEBIT, CREDIT } = ledgerModule;
const accounts = accountsModule;
const { reconcile } = reconcileModule;
const { runAutoConfirm } = autoConfirmModule;

let institution;
let subject;
let student;
let tutor;
let admin;
let coordinator;

const HOURLY_RATE = 10;

beforeEach(async () => {
  await resetDatabase();
  await createPlatformWallet();

  institution = await createInstitution({ balance: 1000 });
  const unit = await createUnit(institution.id);
  subject = await createSubject(institution.id, unit.id);

  student = await createUser({
    role: "student",
    institutionId: institution.id,
    balance: 500,
  });
  tutor = await createTutor({
    institutionId: institution.id,
    subjectId: subject.id,
    hourlyRate: HOURLY_RATE,
    availability: [{ dayOfWeek: 1, startTime: "08:00", endTime: "20:00" }],
  });
  coordinator = await createUser({
    role: "institution_admin",
    institutionId: institution.id,
  });
  admin = await createUser({ role: "platform_admin" });
});

const book = (overrides = {}) =>
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

const completeFlow = async () => {
  const booked = await book();
  const id = booked.body.data.id;

  await request(app).put(`/api/sessions/${id}/confirm`).set(authHeader(tutor));
  await request(app).put(`/api/sessions/${id}/complete`).set(authHeader(tutor));
  await request(app)
    .put(`/api/sessions/${id}/student-confirm`)
    .set(authHeader(student));

  return id;
};

describe("postEntry rechaza asientos inválidos", () => {
  const leg = (kind, direction, amount) => ({
    account: kind,
    direction,
    amount,
  });

  it("rechaza un asiento descuadrado", async () => {
    await expect(
      prisma.$transaction((tx) =>
        postEntry(tx, {
          reason: "test.unbalanced",
          currency: "USD",
          legs: [
            leg(accounts.userWallet(student.id, "USD"), DEBIT, 10),
            leg(accounts.userEscrow(student.id, "USD"), CREDIT, 9),
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: "LEDGER_UNBALANCED" });
  });

  it("rechaza un asiento de un solo movimiento", async () => {
    await expect(
      prisma.$transaction((tx) =>
        postEntry(tx, {
          reason: "test.single",
          currency: "USD",
          legs: [leg(accounts.userWallet(student.id, "USD"), CREDIT, 10)],
        }),
      ),
    ).rejects.toMatchObject({ code: "LEDGER_UNBALANCED" });
  });

  it("rechaza montos no positivos", async () => {
    await expect(
      prisma.$transaction((tx) =>
        postEntry(tx, {
          reason: "test.zero",
          currency: "USD",
          legs: [
            leg(accounts.userWallet(student.id, "USD"), DEBIT, 0),
            leg(accounts.userEscrow(student.id, "USD"), CREDIT, 0),
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: "LEDGER_INVALID_AMOUNT" });
  });

  it("rechaza mezclar monedas en un mismo asiento", async () => {
    await expect(
      prisma.$transaction((tx) =>
        postEntry(tx, {
          reason: "test.currencies",
          currency: "USD",
          legs: [
            leg(accounts.userWallet(student.id, "USD"), DEBIT, 10),
            leg(accounts.userEscrow(student.id, "HNL"), CREDIT, 10),
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: "LEDGER_CURRENCY_MISMATCH" });
  });

  it("no deja rastro cuando el asiento se rechaza", async () => {
    const before = await prisma.ledgerEntry.count();

    await prisma.$transaction((tx) =>
      postEntry(tx, {
        reason: "test.unbalanced",
        currency: "USD",
        legs: [
          leg(accounts.userWallet(student.id, "USD"), DEBIT, 10),
          leg(accounts.userEscrow(student.id, "USD"), CREDIT, 9),
        ],
      }),
    ).catch(() => {});

    expect(await prisma.ledgerEntry.count()).toBe(before);
  });
});

describe("el ledger refleja el ciclo de la sesión", () => {
  it("la reserva mueve el dinero de la wallet al escrow", async () => {
    await book();

    expect(
      Number(await accountBalance(prisma, accounts.userWallet(student.id, "USD"))),
    ).toBe(500 - HOURLY_RATE);
    expect(
      Number(await accountBalance(prisma, accounts.userEscrow(student.id, "USD"))),
    ).toBe(HOURLY_RATE);
  });

  it("la liquidación vacía el escrow y reparte entre tutor y plataforma", async () => {
    await completeFlow();

    const platform = await prisma.user.findUnique({
      where: { email: "platform@macaw.app" },
    });

    expect(
      Number(await accountBalance(prisma, accounts.userEscrow(student.id, "USD"))),
    ).toBe(0);
    expect(
      Number(await accountBalance(prisma, accounts.userWallet(tutor.id, "USD"))),
    ).toBe(9);
    expect(
      Number(await accountBalance(prisma, accounts.userWallet(platform.id, "USD"))),
    ).toBe(1);
  });

  it("cada asiento del ciclo cuadra", async () => {
    await completeFlow();

    const result = await reconcile(prisma);

    expect(result.unbalancedTransactions).toEqual([]);
    expect(result.balanced).toBe(true);
  });

  it("las proyecciones coinciden con el ledger", async () => {
    await completeFlow();

    const result = await reconcile(prisma);

    expect(result.projectionMismatches).toEqual([]);
  });

  it("la comisión congelada en la sesión sobrevive a un cambio de la tasa", async () => {
    const booked = await book();
    const id = booked.body.data.id;

    await prisma.institution.update({
      where: { id: institution.id },
      data: { commissionRate: 0.5 },
    });

    await request(app).put(`/api/sessions/${id}/confirm`).set(authHeader(tutor));
    await request(app).put(`/api/sessions/${id}/complete`).set(authHeader(tutor));
    await request(app)
      .put(`/api/sessions/${id}/student-confirm`)
      .set(authHeader(student));

    expect(
      Number(await accountBalance(prisma, accounts.userWallet(tutor.id, "USD"))),
    ).toBe(9);
  });
});

describe("idempotencia", () => {
  it("liquidar dos veces la misma sesión es imposible", async () => {
    const id = await completeFlow();

    const session = await prisma.session.findUnique({ where: { id } });

    await expect(
      prisma.$transaction((tx) =>
        postEntry(tx, {
          reason: "session.completed",
          idempotencyKey: `session:${id}:settlement`,
          currency: "USD",
          legs: [
            {
              account: accounts.userEscrow(session.studentId, "USD"),
              direction: DEBIT,
              amount: session.price,
            },
            {
              account: accounts.userWallet(session.tutorId, "USD"),
              direction: CREDIT,
              amount: session.price,
            },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: "LEDGER_DUPLICATE_ENTRY" });
  });

  it("el job de auto-confirmación no vuelve a pagar una sesión ya liquidada", async () => {
    const booked = await book();
    const id = booked.body.data.id;

    await request(app).put(`/api/sessions/${id}/confirm`).set(authHeader(tutor));
    await request(app).put(`/api/sessions/${id}/complete`).set(authHeader(tutor));

    await prisma.session.update({
      where: { id },
      data: { updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    });

    const first = await runAutoConfirm();
    expect(first.processed).toBe(1);

    const tutorBalance = await accountBalance(
      prisma,
      accounts.userWallet(tutor.id, "USD"),
    );

    await prisma.session.update({
      where: { id },
      data: {
        status: "pending_confirmation",
        updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      },
    });

    const second = await runAutoConfirm();

    expect(second.processed).toBe(0);
    expect(second.skipped).toBe(1);
    expect(
      Number(await accountBalance(prisma, accounts.userWallet(tutor.id, "USD"))),
    ).toBe(Number(tutorBalance));
  });

  it("el job no se detiene ante una sesión problemática", async () => {
    const broken = await book();
    const good = await book({ startTime: "12:00", endTime: "13:00" });

    for (const id of [broken.body.data.id, good.body.data.id]) {
      await request(app)
        .put(`/api/sessions/${id}/confirm`)
        .set(authHeader(tutor));
      await request(app)
        .put(`/api/sessions/${id}/complete`)
        .set(authHeader(tutor));
    }

    await prisma.session.updateMany({
      where: { status: "pending_confirmation" },
      data: { updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    });

    await prisma.ledgerTransaction.create({
      data: {
        reason: "session.completed",
        idempotencyKey: `session:${broken.body.data.id}:settlement`,
      },
    });

    const result = await runAutoConfirm();

    expect(result.skipped).toBe(1);
    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);
  });
});

describe("no negatividad", () => {
  it("la base rechaza dejar una wallet en negativo", async () => {
    await expect(
      prisma.wallet.update({
        where: { userId: student.id },
        data: { balance: { decrement: 100000 } },
      }),
    ).rejects.toThrow();
  });

  it("la base rechaza dejar una institución en negativo", async () => {
    await expect(
      prisma.institution.update({
        where: { id: institution.id },
        data: { balance: { decrement: 100000 } },
      }),
    ).rejects.toThrow();
  });

  it("reservar sin saldo suficiente no mueve nada", async () => {
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
        date: nextDateFor(1, 3),
        startTime: "10:00",
        endTime: "11:00",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("WALLET_INSUFFICIENT_BALANCE");
    expect(
      Number(await accountBalance(prisma, accounts.userEscrow(broke.id, "USD"))),
    ).toBe(0);
  });
});

describe("invariantes contables sobre operaciones aleatorias", () => {
  it("el ledger cuadra y las proyecciones coinciden tras cientos de operaciones", async () => {
    const students = [student];
    const tutors = [tutor];

    for (let i = 0; i < 3; i++)
      students.push(
        await createUser({
          role: "student",
          institutionId: institution.id,
          balance: 500,
        }),
      );

    for (let i = 0; i < 2; i++)
      tutors.push(
        await createTutor({
          institutionId: institution.id,
          subjectId: subject.id,
          hourlyRate: 7 + i * 6,
          availability: [
            { dayOfWeek: 1, startTime: "08:00", endTime: "20:00" },
            { dayOfWeek: 2, startTime: "08:00", endTime: "20:00" },
          ],
        }),
      );

    const slots = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"];
    const created = [];

    for (const [s, currentStudent] of students.entries()) {
      for (const [t, currentTutor] of tutors.entries()) {
        for (let week = 2; week < 5; week++) {
          const start = slots[(s + t + week) % slots.length];
          const res = await request(app)
            .post("/api/sessions")
            .set(authHeader(currentStudent))
            .send({
              tutorId: currentTutor.id,
              subjectId: subject.id,
              date: nextDateFor((t % 2) + 1, week),
              startTime: start,
              endTime: `${String(Number(start.slice(0, 2)) + 1).padStart(2, "0")}:00`,
            });

          if (res.status === 201)
            created.push({
              id: res.body.data.id,
              student: currentStudent,
              tutor: currentTutor,
            });
        }
      }
    }

    expect(created.length).toBeGreaterThan(20);

    for (const [index, session] of created.entries()) {
      const path = `/api/sessions/${session.id}`;

      if (index % 5 === 0) {
        await request(app).put(`${path}/cancel`).set(authHeader(session.student));
        continue;
      }

      await request(app).put(`${path}/confirm`).set(authHeader(session.tutor));

      if (index % 5 === 1) {
        await request(app).put(`${path}/cancel`).set(authHeader(session.tutor));
        continue;
      }

      await request(app).put(`${path}/complete`).set(authHeader(session.tutor));

      if (index % 5 === 2) {
        await request(app)
          .put(`${path}/student-confirm`)
          .set(authHeader(session.student));
        continue;
      }

      if (index % 5 === 3) {
        await request(app)
          .put(`${path}/dispute`)
          .set(authHeader(session.student))
          .send({ reason: "prueba de invariantes" });
        await request(app)
          .put(`${path}/resolve`)
          .set(authHeader(admin))
          .send({ favorOf: index % 10 === 3 ? "tutor" : "student" });
      }
    }

    for (const currentStudent of students) {
      await request(app)
        .post("/api/wallet/subsidy")
        .set(authHeader(coordinator))
        .send({ studentId: currentStudent.id, amount: 25 });
    }

    await prisma.session.updateMany({
      where: { status: "pending_confirmation" },
      data: { updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    });
    await runAutoConfirm();

    const result = await reconcile(prisma);
    const totals = await ledgerTotals();

    expect(result.unbalancedTransactions).toEqual([]);
    expect(result.projectionMismatches).toEqual([]);
    expect(result.balanced).toBe(true);
    expect(totals.debits).toBeCloseTo(totals.credits, 2);

    const negativas = await prisma.wallet.findMany({
      where: { OR: [{ balance: { lt: 0 } }, { frozen: { lt: 0 } }] },
    });
    expect(negativas).toHaveLength(0);
  });
});
