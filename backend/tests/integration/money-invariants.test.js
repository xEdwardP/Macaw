import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

import app from "../../src/app.js";
import dbHelpers from "../helpers/db.js";
import factories from "../helpers/factories.js";

const { prisma, resetDatabase, walletTotals } = dbHelpers;
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
const INITIAL_BALANCE = 1000;

let institution;
let subject;
let students;
let tutors;
let admin;
let platform;

const round = (value) => Math.round(value * 100) / 100;

const expectedFrozenFromLiveSessions = async () => {
  const sessions = await prisma.session.findMany({
    where: { status: { in: ["pending", "confirmed", "pending_confirmation"] } },
    select: { price: true },
  });
  return round(sessions.reduce((total, s) => total + Number(s.price), 0));
};

beforeEach(async () => {
  await resetDatabase();

  platform = await createPlatformWallet();
  institution = await createInstitution();
  const unit = await createUnit(institution.id);
  subject = await createSubject(institution.id, unit.id);

  students = [];
  for (let i = 0; i < 4; i++) {
    students.push(
      await createUser({
        role: "student",
        institutionId: institution.id,
        balance: INITIAL_BALANCE,
      }),
    );
  }

  tutors = [];
  for (let i = 0; i < 3; i++) {
    tutors.push(
      await createTutor({
        institutionId: institution.id,
        subjectId: subject.id,
        hourlyRate: 10 + i * 5,
        availability: [
          { dayOfWeek: 1, startTime: "08:00", endTime: "20:00" },
          { dayOfWeek: 2, startTime: "08:00", endTime: "20:00" },
        ],
      }),
    );
  }

  admin = await createUser({ role: "platform_admin" });
});

describe("invariantes de dinero", () => {
  it("el dinero total del sistema se conserva tras muchas operaciones", async () => {
    const before = await walletTotals();
    const totalBefore = round(before.balance + before.frozen);

    const slots = ["08:00", "10:00", "12:00", "14:00", "16:00"];
    const created = [];

    for (let i = 0; i < students.length; i++) {
      for (let j = 0; j < tutors.length; j++) {
        const res = await request(app)
          .post("/api/sessions")
          .set(authHeader(students[i]))
          .send({
            tutorId: tutors[j].id,
            subjectId: subject.id,
            date: nextDateFor(j % 2 === 0 ? 1 : 2, 2),
            startTime: slots[(i + j) % slots.length],
            endTime: `${String(Number(slots[(i + j) % slots.length].slice(0, 2)) + 1).padStart(2, "0")}:00`,
          });

        if (res.status === 201)
          created.push({ id: res.body.data.id, student: students[i], tutor: tutors[j] });
      }
    }

    expect(created.length).toBeGreaterThan(5);

    for (const [index, session] of created.entries()) {
      const path = `/api/sessions/${session.id}`;

      if (index % 4 === 0) {
        await request(app).put(`${path}/cancel`).set(authHeader(session.student));
        continue;
      }

      await request(app).put(`${path}/confirm`).set(authHeader(session.tutor));

      if (index % 4 === 1) {
        await request(app).put(`${path}/complete`).set(authHeader(session.tutor));
        await request(app)
          .put(`${path}/student-confirm`)
          .set(authHeader(session.student));
        continue;
      }

      if (index % 4 === 2) {
        await request(app).put(`${path}/complete`).set(authHeader(session.tutor));
        await request(app)
          .put(`${path}/dispute`)
          .set(authHeader(session.student))
          .send({ reason: "prueba de invariantes" });
        await request(app)
          .put(`${path}/resolve`)
          .set(authHeader(admin))
          .send({ favorOf: index % 8 === 2 ? "tutor" : "student" });
      }
    }

    const after = await walletTotals();
    const totalAfter = round(after.balance + after.frozen);

    expect(totalAfter).toBeCloseTo(totalBefore, 2);
  });

  it("el saldo congelado cuadra con las sesiones vivas", async () => {
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post("/api/sessions")
        .set(authHeader(students[i]))
        .send({
          tutorId: tutors[i].id,
          subjectId: subject.id,
          date: nextDateFor(1, 2),
          startTime: "10:00",
          endTime: "11:00",
        });
    }

    const totals = await walletTotals();
    expect(round(totals.frozen)).toBeCloseTo(await expectedFrozenFromLiveSessions(), 2);
  });

  it("ninguna wallet queda con saldo negativo", async () => {
    for (let i = 0; i < students.length; i++) {
      for (let j = 0; j < tutors.length; j++) {
        await request(app)
          .post("/api/sessions")
          .set(authHeader(students[i]))
          .send({
            tutorId: tutors[j].id,
            subjectId: subject.id,
            date: nextDateFor(1, 2 + j),
            startTime: `${String(8 + i).padStart(2, "0")}:00`,
            endTime: `${String(9 + i).padStart(2, "0")}:00`,
          });
      }
    }

    const negativas = await prisma.wallet.findMany({
      where: { OR: [{ balance: { lt: 0 } }, { frozen: { lt: 0 } }] },
    });

    expect(negativas).toHaveLength(0);
  });

  it("la comisión acumulada equivale a la tasa por sesión completada", async () => {
    const completed = [];

    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post("/api/sessions")
        .set(authHeader(students[i]))
        .send({
          tutorId: tutors[i].id,
          subjectId: subject.id,
          date: nextDateFor(1, 2),
          startTime: "10:00",
          endTime: "11:00",
        });

      const id = res.body.data.id;
      completed.push(Number(res.body.data.price));

      await request(app)
        .put(`/api/sessions/${id}/confirm`)
        .set(authHeader(tutors[i]));
      await request(app)
        .put(`/api/sessions/${id}/complete`)
        .set(authHeader(tutors[i]));
      await request(app)
        .put(`/api/sessions/${id}/student-confirm`)
        .set(authHeader(students[i]));
    }

    const expectedCommission = round(
      completed.reduce((total, price) => total + price * COMMISSION_RATE, 0),
    );

    const platformWallet = await prisma.wallet.findUnique({
      where: { userId: platform.id },
    });

    expect(Number(platformWallet.balance)).toBeCloseTo(expectedCommission, 2);
    expect(Number(platformWallet.lifetimeEarned)).toBeCloseTo(expectedCommission, 2);
  });

  it("cada sesión completada deja su transacción de comisión", async () => {
    const res = await request(app)
      .post("/api/sessions")
      .set(authHeader(students[0]))
      .send({
        tutorId: tutors[0].id,
        subjectId: subject.id,
        date: nextDateFor(1, 2),
        startTime: "10:00",
        endTime: "11:00",
      });

    const id = res.body.data.id;
    await request(app)
      .put(`/api/sessions/${id}/confirm`)
      .set(authHeader(tutors[0]));
    await request(app)
      .put(`/api/sessions/${id}/complete`)
      .set(authHeader(tutors[0]));
    await request(app)
      .put(`/api/sessions/${id}/student-confirm`)
      .set(authHeader(students[0]));

    const completedSessions = await prisma.session.count({
      where: { status: "completed" },
    });
    const commissionTx = await prisma.transaction.count({
      where: { type: "commission" },
    });

    expect(commissionTx).toBe(completedSessions);
  });

  it("el subsidio mueve el saldo de la institución a la wallet sin crear dinero", async () => {
    const coordinator = await createUser({
      role: "institution_admin",
      institutionId: institution.id,
    });
    await prisma.institution.update({
      where: { id: institution.id },
      data: { balance: 500 },
    });

    const before = await walletTotals();

    await request(app)
      .post("/api/wallet/subsidy")
      .set(authHeader(coordinator))
      .send({ studentId: students[0].id, amount: 120 });

    const after = await walletTotals();
    const institutionAfter = await prisma.institution.findUnique({
      where: { id: institution.id },
    });

    expect(round(after.balance - before.balance)).toBe(120);
    expect(Number(institutionAfter.balance)).toBe(380);
  });
});
