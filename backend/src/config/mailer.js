const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 5000,
  family: 4,
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
