import { describe, it, expect, beforeEach } from "vitest";
import { createRequire } from "module";

import dbHelpers from "../helpers/db.js";
import factories from "../helpers/factories.js";

const require = createRequire(import.meta.url);
const {
  runSessionReminders,
  reminderKey,
} = require("../../src/jobs/sessionReminders.js");
const {
  runOutboxDispatcher,
} = require("../../src/jobs/outboxDispatcher.js");

const { prisma, resetDatabase } = dbHelpers;
const {
  createInstitution,
  createUnit,
  createSubject,
  createUser,
  createTutor,
  createPlatformWallet,
} = factories;

let institution;
let subject;
let student;
let tutor;

const daysFromNow = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(0, 0, 0, 0);
  return date;
};

const createSession = (overrides = {}) =>
  prisma.session.create({
    data: {
      institutionId: institution.id,
      studentId: student.id,
      tutorId: tutor.id,
      subjectId: subject.id,
      date: daysFromNow(1),
      startTime: "10:00",
      endTime: "11:00",
      status: "confirmed",
      price: 10,
      currency: institution.currencyCode,
      meetingUrl: "https://meet.macaw.app/abc",
      ...overrides,
    },
  });

const reminders = () =>
  prisma.outboxEvent.findMany({ where: { type: "session_reminder" } });

beforeEach(async () => {
  await resetDatabase();
  await createPlatformWallet();

  institution = await createInstitution({});
  const unit = await createUnit(institution.id);
  subject = await createSubject(institution.id, unit.id);
  student = await createUser({ role: "student", institutionId: institution.id });
  tutor = await createTutor({ institutionId: institution.id, subjectId: subject.id });
});

describe("recordatorios de sesión", () => {
  it("encola un recordatorio por cada sesión confirmada de mañana", async () => {
    const session = await createSession();

    const result = await runSessionReminders();

    expect(result).toEqual({ queued: 1, skipped: 0, total: 1 });

    const [event] = await reminders();
    expect(event.payload.sessionId).toBe(session.id);
    expect(event.payload.studentEmail).toBe(student.email);
    expect(event.payload.tutorEmail).toBe(tutor.email);
    expect(event.payload.meetingUrl).toBe("https://meet.macaw.app/abc");
    expect(event.payload.idempotencyKey).toBe(reminderKey(session.id));
  });

  it("ejecutarlo dos veces no encola dos recordatorios", async () => {
    await createSession();

    await runSessionReminders();
    const second = await runSessionReminders();

    expect(second).toEqual({ queued: 0, skipped: 1, total: 1 });
    expect(await reminders()).toHaveLength(1);
  });

  it("ignora las sesiones que no son de mañana", async () => {
    await createSession({ date: daysFromNow(0) });
    await createSession({ date: daysFromNow(2) });

    const result = await runSessionReminders();

    expect(result.total).toBe(0);
    expect(await reminders()).toHaveLength(0);
  });

  it("ignora las sesiones que no están confirmadas", async () => {
    await createSession({ status: "pending" });
    await createSession({ status: "cancelled" });

    const result = await runSessionReminders();

    expect(result.total).toBe(0);
  });

  it("encola una sesión nueva sin volver a encolar la anterior", async () => {
    await createSession();
    await runSessionReminders();

    await createSession({ startTime: "14:00", endTime: "15:00" });

    const result = await runSessionReminders();

    expect(result).toEqual({ queued: 1, skipped: 1, total: 2 });
    expect(await reminders()).toHaveLength(2);
  });

  it("el despachador entrega el recordatorio encolado", async () => {
    await createSession();
    await runSessionReminders();

    await prisma.outboxEvent.updateMany({
      data: { availableAt: new Date(Date.now() - 60000) },
    });

    const delivered = [];
    const result = await runOutboxDispatcher(async (event) => {
      delivered.push(event.type);
    });

    expect(result).toEqual({ delivered: 1, failed: 0, total: 1 });
    expect(delivered).toEqual(["session_reminder"]);

    const [event] = await reminders();
    expect(event.status).toBe("delivered");
  });
});
