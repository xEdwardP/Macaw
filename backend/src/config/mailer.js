const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const sendMail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: `"Macaw" <${process.env.MAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`Email enviado a ${to}`);
  } catch (err) {
    console.error(`Error enviando email a ${to}:`, err.message);
  }
};

module.exports = { sendMail };
