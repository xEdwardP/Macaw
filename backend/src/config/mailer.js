const nodemailer = require("nodemailer");
const env = require("./env");
const logger = require("./logger");

const transporter = nodemailer.createTransport({
  host: env.MAIL_HOST,
  port: env.MAIL_PORT,
  secure: env.MAIL_PORT === 465,
  auth: {
    user: env.MAIL_USER,
    pass: env.MAIL_PASS,
  },
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 5000,
  family: 4,
});

const sendMail = async ({ to, subject, html }) => {
  if (!env.MAIL_USER || !env.MAIL_PASS) {
    logger.warn(
      { to, subject },
      "Correo no enviado: falta configurar MAIL_USER y MAIL_PASS",
    );
    return;
  }

  await transporter.sendMail({
    from: `"Macaw" <${env.MAIL_USER}>`,
    to,
    subject,
    html,
  });

  logger.info({ to, subject }, "Email enviado");
};

module.exports = { sendMail };
