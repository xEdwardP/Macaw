const prisma = require("../config/prisma");
const logger = require("../config/logger");
const outbox = require("../shared/events/outbox");
const sessionMoney = require("../modules/sessions/sessions.money");
const { toNumber } = require("../shared/money/money");
const ERROR_CODES = require("../shared/errors/codes");

const AUTO_CONFIRM_AFTER_HOURS = 24;

const runAutoConfirm = async () => {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - AUTO_CONFIRM_AFTER_HOURS);

  const sessions = await prisma.session.findMany({
    where: { status: "pending_confirmation", updatedAt: { lte: cutoff } },
    select: { id: true, tutorId: true, studentId: true },
  });

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const session of sessions) {
    try {
      const { net } = await sessionMoney.settleSessionById(session.id, {
        reason: "session.auto_confirmed",
        description: "Pago recibido (auto-confirmado)",
      });

      await prisma.$transaction(async (tx) => {
        const [student, tutor, full] = await Promise.all([
          tx.user.findUnique({ where: { id: session.studentId } }),
          tx.user.findUnique({ where: { id: session.tutorId } }),
          tx.session.findUnique({ where: { id: session.id } }),
        ]);

        await outbox.publish(tx, "session_completed", {
          studentName: student?.name,
          studentEmail: student?.email,
          tutorName: tutor?.name,
          tutorEmail: tutor?.email,
          date: new Date(full.date).toLocaleDateString("es-HN"),
          startTime: full.startTime,
          tutorEarnings: toNumber(net),
        });
      });

      processed += 1;
    } catch (err) {
      if (err.code === ERROR_CODES.LEDGER_DUPLICATE_ENTRY) {
        skipped += 1;
        continue;
      }

      failed += 1;
      logger.error(
        { sessionId: session.id, err: err.message },
        "Error auto-confirmando la sesión",
      );
    }
  }

  logger.info(
    { processed, skipped, failed, total: sessions.length },
    "Auto-confirmaciones procesadas",
  );

  return { processed, skipped, failed, total: sessions.length };
};

module.exports = { runAutoConfirm, AUTO_CONFIRM_AFTER_HOURS };
