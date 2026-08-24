const prisma = require("../config/prisma");
const logger = require("../config/logger");
const outbox = require("../shared/events/outbox");

const reminderKey = (sessionId) => `session:${sessionId}:reminder`;

const runSessionReminders = async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const sessions = await prisma.session.findMany({
    where: {
      status: "confirmed",
      date: { gte: tomorrow, lt: dayAfter },
    },
    include: { student: true, tutor: true },
  });

  let queued = 0;
  let skipped = 0;

  for (const session of sessions) {
    const alreadyQueued = await prisma.outboxEvent.findFirst({
      where: {
        type: "session_reminder",
        payload: { path: ["idempotencyKey"], equals: reminderKey(session.id) },
      },
      select: { id: true },
    });

    if (alreadyQueued) {
      skipped += 1;
      continue;
    }

    await outbox.publish(prisma, "session_reminder", {
      idempotencyKey: reminderKey(session.id),
      sessionId: session.id,
      studentName: session.student.name,
      studentEmail: session.student.email,
      tutorName: session.tutor.name,
      tutorEmail: session.tutor.email,
      date: new Date(session.date).toLocaleDateString("es-HN"),
      startTime: session.startTime,
      meetingUrl: session.meetingUrl,
    });

    queued += 1;
  }

  logger.info(
    { queued, skipped, total: sessions.length },
    "Recordatorios encolados",
  );

  return { queued, skipped, total: sessions.length };
};

module.exports = { runSessionReminders, reminderKey };
