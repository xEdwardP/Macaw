const axios = require("axios");
const env = require("../config/env");
const logger = require("../config/logger");
const prisma = require("../config/prisma");
const outbox = require("../shared/events/outbox");
const { sendMail } = require("../config/mailer");
const templates = require("../utils/emailTemplates");
const { localeForEmail, localeForUser } = require("../shared/i18n/recipients");
const {
  acceptUrl,
  clientUrl,
} = require("../modules/institutions/invitations.links");

const notifyMake = async (event) => {
  if (!env.MAKE_WEBHOOK_URL) return;

  await axios.post(
    env.MAKE_WEBHOOK_URL,
    { eventType: event.type, ...event.payload },
    { timeout: 10000 },
  );
};

const sendReminder = async (event) => {
  const {
    studentName,
    studentEmail,
    tutorName,
    tutorEmail,
    date,
    startTime,
    meetingUrl,
  } = event.payload;

  await sendMail({
    to: studentEmail,
    ...templates.sessionReminder(
      { userName: studentName, tutorName, date, startTime, meetingUrl },
      await localeForEmail(studentEmail),
    ),
  });

  await sendMail({
    to: tutorEmail,
    ...templates.sessionReminder(
      {
        userName: tutorName,
        tutorName: studentName,
        date,
        startTime,
        meetingUrl,
      },
      await localeForEmail(tutorEmail),
    ),
  });
};

const sendInvitation = async (event) => {
  const { email, name, role, token, institutionName, locale, expiresAt } =
    event.payload;

  await sendMail({
    to: email,
    ...templates.invitation(
      { name, institutionName, role, acceptUrl: acceptUrl(token), expiresAt },
      locale,
    ),
  });
};

const sendDomainVerification = async (event) => {
  const { email, domain, token } = event.payload;

  await sendMail({
    to: email,
    ...templates.domainVerification(
      { domain, token },
      await localeForEmail(email),
    ),
  });
};

const sendPlanUsageWarning = async (event) => {
  const { institutionId, institutionName, planName, students, maxStudents, threshold } =
    event.payload;

  const admins = await prisma.user.findMany({
    where: { institutionId, role: "institution_admin", isActive: true },
    select: {
      name: true,
      email: true,
      locale: true,
      institution: { select: { locale: true } },
    },
  });

  for (const admin of admins) {
    await sendMail({
      to: admin.email,
      ...templates.planUsageWarning(
        {
          adminName: admin.name,
          institutionName,
          planName,
          students,
          maxStudents,
          threshold,
        },
        localeForUser(admin),
      ),
    });
  }
};

const sendPasswordReset = async (event) => {
  const { email, name, token, locale, expiresInMinutes } = event.payload;

  await sendMail({
    to: email,
    ...templates.passwordReset(
      { name, resetUrl: clientUrl(`/reset-password/${token}`), expiresInMinutes },
      locale,
    ),
  });
};

const sendEmailVerification = async (event) => {
  const { email, name, token, locale } = event.payload;

  await sendMail({
    to: email,
    ...templates.emailVerification(
      { name, verifyUrl: clientUrl(`/verify-email/${token}`) },
      locale,
    ),
  });
};

const sendTutorVerified = async (event) => {
  const { email, name, institutionName, locale } = event.payload;

  await sendMail({
    to: email,
    ...templates.tutorVerified({ name, institutionName }, locale),
  });
};

const HANDLERS = {
  session_reminder: sendReminder,
  invitation_created: sendInvitation,
  domain_verification: sendDomainVerification,
  plan_usage_warning: sendPlanUsageWarning,
  password_reset_requested: sendPasswordReset,
  email_verification_requested: sendEmailVerification,
  tutor_verified: sendTutorVerified,
};

const deliver = (event) => (HANDLERS[event.type] || notifyMake)(event);

const runOutboxDispatcher = async (deliverEvent = deliver) => {
  const events = await outbox.claimBatch();
  if (events.length === 0) return { delivered: 0, failed: 0, total: 0 };

  let delivered = 0;
  let failed = 0;

  for (const event of events) {
    try {
      await deliverEvent(event);
      await outbox.markDelivered(event);
      delivered += 1;
    } catch (err) {
      failed += 1;
      await outbox.markFailed(event, err);
      logger.warn(
        { eventId: event.id, type: event.type, err: err.message },
        "Fallo al despachar evento del outbox",
      );
    }
  }

  logger.info({ delivered, failed, total: events.length }, "Outbox despachado");

  return { delivered, failed, total: events.length };
};

module.exports = { runOutboxDispatcher, deliver };
