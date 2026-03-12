const cron = require("node-cron");
const { PrismaClient } = require("@prisma/client");
const { sendMail } = require("../config/mailer");
const templates = require("../utils/emailTemplates");
const prisma = new PrismaClient();

const scheduleReminders = () => {
  cron.schedule("0 8 * * *", async () => {
    console.log("Corriendo job de recordatorios...");

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const sessions = await prisma.session.findMany({
      where: {
        status: "confirmed",
        date: {
          gte: tomorrow,
          lt: dayAfter,
        },
      },
      include: {
        student: true,
        tutor: true,
      },
    });

    for (const session of sessions) {
      const date = new Date(session.date).toLocaleDateString("es-HN");

      await sendMail({
        to: session.student.email,
        subject: "Recordatorio: Tienes una sesión mañana",
        html: templates.sessionReminder({
          userName: session.student.name,
          tutorName: session.tutor.name,
          date,
          startTime: session.startTime,
          meetingUrl: session.meetingUrl,
        }),
      });

      await sendMail({
        to: session.tutor.email,
        subject: "Recordatorio: Tienes una sesión mañana",
        html: templates.sessionReminder({
          userName: session.tutor.name,
          tutorName: session.student.name,
          date,
          startTime: session.startTime,
          meetingUrl: session.meetingUrl,
        }),
      });
    }

    console.log(`Recordatorios enviados: ${sessions.length} sesiones`);
  });
};

module.exports = { scheduleReminders };
