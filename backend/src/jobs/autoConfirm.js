const cron = require("node-cron");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const scheduleAutoConfirm = () => {
  cron.schedule("0 * * * *", async () => {
    console.log("Corriendo job de auto-confirmacion...");

    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);

    const sessions = await prisma.session.findMany({
      where: {
        status: "pending_confirmation",
        updatedAt: { lte: cutoff },
      },
      include: { tutor: { include: { wallet: true } } },
    });

    for (const session of sessions) {
      const commission = session.price * 0.1;
      const tutorEarnings = session.price - commission;

      await prisma.$transaction(async (tx) => {
        await tx.session.update({
          where: { id: session.id },
          data: { status: "completed" },
        });

        const studentWallet = await tx.wallet.findUnique({
          where: { userId: session.studentId },
        });
        await tx.wallet.update({
          where: { userId: session.studentId },
          data: { frozen: { decrement: session.price } },
        });

        const tutorWallet = session.tutor.wallet;
        await tx.wallet.update({
          where: { userId: session.tutorId },
          data: {
            balance: { increment: tutorEarnings },
            lifetimeEarned: { increment: tutorEarnings },
          },
        });

        await tx.transaction.create({
          data: {
            walletId: studentWallet.id,
            type: "released",
            amount: session.price,
            description: "Pago auto-liberado al tutor (24hrs sin confirmación)",
            sessionId: session.id,
          },
        });

        await tx.transaction.create({
          data: {
            walletId: tutorWallet.id,
            type: "released",
            amount: tutorEarnings,
            description: "Pago recibido (auto-confirmado)",
            sessionId: session.id,
          },
        });

        await tx.tutorProfile.update({
          where: { userId: session.tutorId },
          data: { totalSessions: { increment: 1 } },
        });
      });

      console.log(`Sesión auto-confirmada: ${session.id}`);
    }

    console.log(`Auto-confirmaciones: ${sessions.length} sesiones procesadas`);
  });
};

module.exports = { scheduleAutoConfirm };
