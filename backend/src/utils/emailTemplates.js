const { translator } = require("../shared/i18n");

const baseTemplate = (content, t) => `
<!DOCTYPE html>
<html lang="${t.locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background:#f4f4f5; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

          <tr>
            <td style="background: linear-gradient(135deg, #ea580c, #f97316); padding: 32px; text-align:center;">
              <h1 style="margin:0; color:#ffffff; font-size:28px; letter-spacing:1px;">Macaw</h1>
              <p style="margin:6px 0 0; color:#ffe8d6; font-size:13px;">${t("email.brand.tagline")}</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 36px 40px;">
              ${content}
            </td>
          </tr>

          <tr>
            <td style="background:#f9fafb; padding: 20px 40px; text-align:center; border-top: 1px solid #e5e7eb;">
              <p style="margin:0; color:#9ca3af; font-size:12px;">
                ${t("email.brand.rights", { year: new Date().getFullYear() })}<br>
                <a href="#" style="color:#ea580c; text-decoration:none;">${t("email.brand.privacy")}</a> ·
                <a href="#" style="color:#ea580c; text-decoration:none;">${t("email.brand.support")}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const infoRow = (label, value) => `
  <tr>
    <td style="padding:10px 12px; color:#6b7280; font-size:14px; width:35%;">${label}</td>
    <td style="padding:10px 12px; color:#111827; font-size:14px; font-weight:600;">${value}</td>
  </tr>
`;

const button = (text, url) => `
  <div style="text-align:center; margin-top:28px;">
    <a href="${url}" style="background:#ea580c; color:#ffffff; padding:14px 32px; text-decoration:none; border-radius:8px; font-size:15px; font-weight:600; display:inline-block;">
      ${text}
    </a>
  </div>
`;

const heading = (text) =>
  `<h2 style="margin:0 0 8px; color:#111827; font-size:22px;">${text}</h2>`;

const paragraph = (text) =>
  `<p style="margin:0 0 24px; color:#6b7280; font-size:15px;">${text}</p>`;

const dataTable = (rows) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb; border-radius:8px; border:1px solid #e5e7eb;">
    ${rows.filter(Boolean).join("")}
  </table>
`;

const CALLOUT_TONES = {
  positive: { background: "#ecfdf5", border: "#a7f3d0", content: "#065f46" },
  warning: { background: "#fef3c7", border: "#fde68a", content: "#92400e" },
  danger: { background: "#fef2f2", border: "#fecaca", content: "#991b1b" },
  info: { background: "#eff6ff", border: "#bfdbfe", content: "#1e40af" },
};

const callout = (tone, text) => {
  const { background, border, content } = CALLOUT_TONES[tone];
  return `
  <div style="background:${background}; border:1px solid ${border}; border-radius:8px; padding:14px 16px; margin-top:20px;">
    <p style="margin:0; color:${content}; font-size:14px;">${text}</p>
  </div>
`;
};

const template = (build) => (data, locale) => {
  const t = translator(locale);
  const { subject, content } = build(data, t);
  return { subject, html: baseTemplate(content, t) };
};

const sessionBooked = template(
  ({ studentName, tutorName, subject, date, startTime, meetingUrl }, t) => ({
    subject: t("email.sessionBooked.subject"),
    content: `
    ${heading(t("email.sessionBooked.title"))}
    ${paragraph(t("email.sessionBooked.intro", { studentName }))}
    ${dataTable([
      infoRow(t("email.field.tutor"), tutorName),
      infoRow(t("email.field.subject"), subject),
      infoRow(t("email.field.date"), date),
      infoRow(t("email.field.time"), startTime),
    ])}
    <p style="margin:24px 0 0; color:#6b7280; font-size:14px;">${t("email.sessionBooked.note")}</p>
    ${button(t("email.sessionBooked.cta"), meetingUrl)}
  `,
  }),
);

const sessionConfirmed = template(
  ({ studentName, tutorName, date, startTime, meetingUrl }, t) => ({
    subject: t("email.sessionConfirmed.subject"),
    content: `
    ${heading(t("email.sessionConfirmed.title"))}
    ${paragraph(t("email.sessionConfirmed.intro", { studentName, tutorName }))}
    ${dataTable([
      infoRow(t("email.field.tutor"), tutorName),
      infoRow(t("email.field.date"), date),
      infoRow(t("email.field.time"), startTime),
    ])}
    ${callout("warning", t("email.sessionConfirmed.warning"))}
    ${button(t("email.sessionConfirmed.cta"), meetingUrl)}
  `,
  }),
);

const sessionCancelled = template(
  ({ userName, date, startTime, refundAmount, currency }, t) => {
    const refund = refundAmount ? t.money(refundAmount, currency) : null;
    return {
      subject: t("email.sessionCancelled.subject"),
      content: `
    ${heading(t("email.sessionCancelled.title"))}
    ${paragraph(t("email.sessionCancelled.intro", { userName }))}
    ${dataTable([
      infoRow(t("email.field.date"), date),
      infoRow(t("email.field.time"), startTime),
      refund && infoRow(t("email.field.refund"), refund),
    ])}
    ${refund ? callout("positive", t("email.sessionCancelled.refunded", { amount: refund })) : ""}
  `,
    };
  },
);

const sessionReminder = template(
  ({ userName, tutorName, date, startTime, meetingUrl }, t) => ({
    subject: t("email.sessionReminder.subject"),
    content: `
    ${heading(t("email.sessionReminder.title"))}
    ${paragraph(t("email.sessionReminder.intro", { userName }))}
    ${dataTable([
      infoRow(t("email.field.with"), tutorName),
      infoRow(t("email.field.date"), date),
      infoRow(t("email.field.time"), startTime),
    ])}
    ${callout("info", t("email.sessionReminder.note"))}
    ${button(t("email.sessionReminder.cta"), meetingUrl)}
  `,
  }),
);

const sessionPendingConfirmation = template(
  ({ studentName, tutorName, date, startTime }, t) => ({
    subject: t("email.sessionPendingConfirmation.subject"),
    content: `
    ${heading(t("email.sessionPendingConfirmation.title"))}
    ${paragraph(t("email.sessionPendingConfirmation.intro", { studentName, tutorName }))}
    ${dataTable([
      infoRow(t("email.field.tutor"), tutorName),
      infoRow(t("email.field.date"), date),
      infoRow(t("email.field.time"), startTime),
    ])}
    ${callout("warning", t("email.sessionPendingConfirmation.warning"))}
  `,
  }),
);

const sessionDisputed = template(
  ({ adminName, studentName, tutorName, date, startTime, reason }, t) => ({
    subject: t("email.sessionDisputed.subject"),
    content: `
    ${heading(t("email.sessionDisputed.title"))}
    ${paragraph(t("email.sessionDisputed.intro", { adminName, studentName }))}
    ${dataTable([
      infoRow(t("email.field.student"), studentName),
      infoRow(t("email.field.tutor"), tutorName),
      infoRow(t("email.field.date"), date),
      infoRow(t("email.field.time"), startTime),
      infoRow(t("email.field.reason"), reason),
    ])}
    ${callout("danger", t("email.sessionDisputed.note"))}
  `,
  }),
);

const sessionDisputeResolved = template(
  ({ userName, favorOf, amount, currency }, t) => ({
    subject: t("email.sessionDisputeResolved.subject"),
    content: `
    ${heading(t("email.sessionDisputeResolved.title"))}
    ${paragraph(t("email.sessionDisputeResolved.intro", { userName }))}
    ${callout(
      "positive",
      t(
        favorOf === "student"
          ? "email.sessionDisputeResolved.refunded"
          : "email.sessionDisputeResolved.credited",
        { amount: t.money(amount, currency) },
      ),
    )}
  `,
  }),
);

const withdrawalRequested = template(
  ({ adminName, tutorName, amount, currency, paypalEmail }, t) => ({
    subject: t("email.withdrawalRequested.subject"),
    content: `
    ${heading(t("email.withdrawalRequested.title"))}
    ${paragraph(t("email.withdrawalRequested.intro", { adminName, tutorName }))}
    ${dataTable([
      infoRow(t("email.field.tutor"), tutorName),
      infoRow(t("email.field.amount"), t.money(amount, currency)),
      infoRow(t("email.field.paypal"), paypalEmail),
    ])}
    ${callout("info", t("email.withdrawalRequested.note"))}
  `,
  }),
);

const withdrawalApproved = template(
  ({ tutorName, amount, currency, paypalEmail }, t) => ({
    subject: t("email.withdrawalApproved.subject"),
    content: `
    ${heading(t("email.withdrawalApproved.title"))}
    ${paragraph(t("email.withdrawalApproved.intro", { tutorName }))}
    ${dataTable([
      infoRow(t("email.field.amount"), t.money(amount, currency)),
      infoRow(t("email.field.paypal"), paypalEmail),
    ])}
    ${callout("positive", t("email.withdrawalApproved.note"))}
  `,
  }),
);

const withdrawalRejected = template(
  ({ tutorName, amount, currency, notes }, t) => ({
    subject: t("email.withdrawalRejected.subject"),
    content: `
    ${heading(t("email.withdrawalRejected.title"))}
    ${paragraph(t("email.withdrawalRejected.intro", { tutorName }))}
    ${dataTable([
      infoRow(t("email.field.amount"), t.money(amount, currency)),
      infoRow(
        t("email.field.reason"),
        notes || t("email.withdrawalRejected.noReason"),
      ),
    ])}
    ${callout("danger", t("email.withdrawalRejected.note"))}
  `,
  }),
);

const invitation = template(
  ({ name, institutionName, role, acceptUrl, expiresAt }, t) => {
    const roleLabel = t(`email.role.${role}`);
    return {
      subject: t("email.invitation.subject", { institutionName }),
      content: `
    ${heading(t("email.invitation.title"))}
    ${paragraph(
      t(name ? "email.invitation.intro" : "email.invitation.introNoName", {
        name,
        institutionName,
        role: roleLabel,
      }),
    )}
    ${dataTable([
      infoRow(t("email.field.institution"), institutionName),
      infoRow(t("email.field.role"), roleLabel),
      infoRow(t("email.field.validUntil"), t.date(expiresAt)),
    ])}
    <p style="margin:24px 0 0; color:#6b7280; font-size:14px;">${t("email.invitation.note")}</p>
    ${button(t("email.invitation.cta"), acceptUrl)}
  `,
    };
  },
);

const domainVerification = template(({ domain, token }, t) => ({
  subject: t("email.domainVerification.subject", { domain }),
  content: `
    ${heading(t("email.domainVerification.title"))}
    ${paragraph(t("email.domainVerification.intro", { domain }))}
    <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:18px; text-align:center;">
      <p style="margin:0; color:#111827; font-size:20px; font-weight:700; letter-spacing:2px; word-break:break-all;">
        ${token}
      </p>
    </div>
    ${callout("warning", t("email.domainVerification.warning"))}
  `,
}));

const planUsageWarning = template(
  (
    { adminName, institutionName, planName, students, maxStudents, threshold },
    t,
  ) => {
    const reached = threshold >= 1;
    return {
      subject: t(
        reached
          ? "email.planUsageWarning.subjectReached"
          : "email.planUsageWarning.subjectNear",
        { institutionName },
      ),
      content: `
    ${heading(t(reached ? "email.planUsageWarning.titleReached" : "email.planUsageWarning.titleNear"))}
    ${paragraph(t("email.planUsageWarning.intro", { adminName, institutionName, students, maxStudents }))}
    ${dataTable([
      infoRow(t("email.field.plan"), planName),
      infoRow(t("email.field.activeStudents"), String(students)),
      infoRow(t("email.field.planMaximum"), String(maxStudents)),
    ])}
    ${callout(
      reached ? "danger" : "info",
      t(
        reached
          ? "email.planUsageWarning.noteReached"
          : "email.planUsageWarning.noteNear",
      ),
    )}
  `,
    };
  },
);

const passwordReset = template(({ name, resetUrl, expiresInMinutes }, t) => ({
  subject: t("email.passwordReset.subject"),
  content: `
    ${heading(t("email.passwordReset.title"))}
    ${paragraph(t("email.passwordReset.intro", { name }))}
    ${button(t("email.passwordReset.cta"), resetUrl)}
    ${paragraph(t("email.passwordReset.expiry", { minutes: expiresInMinutes }))}
    ${callout("warning", t("email.passwordReset.ignore"))}
  `,
}));

const emailVerification = template(({ name, verifyUrl }, t) => ({
  subject: t("email.emailVerification.subject"),
  content: `
    ${heading(t("email.emailVerification.title"))}
    ${paragraph(t("email.emailVerification.intro", { name }))}
    ${button(t("email.emailVerification.cta"), verifyUrl)}
    ${callout("info", t("email.emailVerification.note"))}
  `,
}));

const tutorVerified = template(({ name, institutionName }, t) => ({
  subject: t("email.tutorVerified.subject"),
  content: `
    ${heading(t("email.tutorVerified.title"))}
    ${paragraph(t("email.tutorVerified.intro", { name, institutionName }))}
    ${callout("positive", t("email.tutorVerified.note"))}
  `,
}));

module.exports = {
  invitation,
  domainVerification,
  planUsageWarning,
  passwordReset,
  emailVerification,
  tutorVerified,
  sessionBooked,
  sessionConfirmed,
  sessionCancelled,
  sessionReminder,
  sessionPendingConfirmation,
  sessionDisputed,
  sessionDisputeResolved,
  withdrawalRequested,
  withdrawalApproved,
  withdrawalRejected,
};
