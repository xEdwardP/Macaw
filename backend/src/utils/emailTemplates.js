const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background:#f4f4f5; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ea580c, #f97316); padding: 32px; text-align:center;">
              <h1 style="margin:0; color:#ffffff; font-size:28px; letter-spacing:1px;">Macaw</h1>
              <p style="margin:6px 0 0; color:#ffe8d6; font-size:13px;">Plataforma de tutorias universitarias</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 36px 40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb; padding: 20px 40px; text-align:center; border-top: 1px solid #e5e7eb;">
              <p style="margin:0; color:#9ca3af; font-size:12px;">
                2026 Macaw · Todos los derechos reservados<br>
                <a href="#" style="color:#ea580c; text-decoration:none;">Politica de privacidad</a> · 
                <a href="#" style="color:#ea580c; text-decoration:none;">Soporte</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

const infoRow = (label, value) => `
  <tr>
    <td style="padding:10px 12px; color:#6b7280; font-size:14px; width:35%;">${label}</td>
    <td style="padding:10px 12px; color:#111827; font-size:14px; font-weight:600;">${value}</td>
  </tr>
`

const button = (text, url) => `
  <div style="text-align:center; margin-top:28px;">
    <a href="${url}" style="background:#ea580c; color:#ffffff; padding:14px 32px; text-decoration:none; border-radius:8px; font-size:15px; font-weight:600; display:inline-block;">
      ${text}
    </a>
  </div>
`

const sessionBooked = ({ studentName, tutorName, subject, date, startTime, meetingUrl }) =>
  baseTemplate(`
    <h2 style="margin:0 0 8px; color:#111827; font-size:22px;">Sesion reservada</h2>
    <p style="margin:0 0 24px; color:#6b7280; font-size:15px;">Hola <strong>${studentName}</strong>, tu sesion fue reservada exitosamente.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb; border-radius:8px; border:1px solid #e5e7eb;">
      ${infoRow('Tutor', tutorName)}
      ${infoRow('Materia', subject)}
      ${infoRow('Fecha', date)}
      ${infoRow('Hora', startTime)}
    </table>

    <p style="margin:24px 0 0; color:#6b7280; font-size:14px;">
      Los creditos han sido reservados. Se liberaran al tutor una vez completada la sesion.
    </p>

    ${button('Unirse a la sesion', meetingUrl)}
  `)

const sessionConfirmed = ({ studentName, tutorName, date, startTime, meetingUrl }) =>
  baseTemplate(`
    <h2 style="margin:0 0 8px; color:#111827; font-size:22px;">Sesion confirmada</h2>
    <p style="margin:0 0 24px; color:#6b7280; font-size:15px;">
      Hola <strong>${studentName}</strong>, el tutor <strong>${tutorName}</strong> ha confirmado tu sesion.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb; border-radius:8px; border:1px solid #e5e7eb;">
      ${infoRow('Tutor', tutorName)}
      ${infoRow('Fecha', date)}
      ${infoRow('Hora', startTime)}
    </table>

    <div style="background:#fef3c7; border:1px solid #fde68a; border-radius:8px; padding:14px 16px; margin-top:20px;">
      <p style="margin:0; color:#92400e; font-size:14px;">
        Recuerda que cancelaciones con menos de 24 horas solo reciben reembolso del 50%.
      </p>
    </div>

    ${button('Unirse a la sesion', meetingUrl)}
  `)

const sessionCancelled = ({ userName, date, startTime, refundAmount }) =>
  baseTemplate(`
    <h2 style="margin:0 0 8px; color:#111827; font-size:22px;">Sesion cancelada</h2>
    <p style="margin:0 0 24px; color:#6b7280; font-size:15px;">
      Hola <strong>${userName}</strong>, la siguiente sesion ha sido cancelada.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb; border-radius:8px; border:1px solid #e5e7eb;">
      ${infoRow('Fecha', date)}
      ${infoRow('Hora', startTime)}
      ${refundAmount ? infoRow('Reembolso', `$${refundAmount}`) : ''}
    </table>

    ${refundAmount ? `
    <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:8px; padding:14px 16px; margin-top:20px;">
      <p style="margin:0; color:#065f46; font-size:14px;">
        Se han reembolsado <strong>$${refundAmount}</strong> a tu wallet.
      </p>
    </div>` : ''}
  `)

const sessionReminder = ({ userName, tutorName, date, startTime, meetingUrl }) =>
  baseTemplate(`
    <h2 style="margin:0 0 8px; color:#111827; font-size:22px;">Recordatorio de sesion</h2>
    <p style="margin:0 0 24px; color:#6b7280; font-size:15px;">
      Hola <strong>${userName}</strong>, te recordamos que tienes una sesion manana.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb; border-radius:8px; border:1px solid #e5e7eb;">
      ${infoRow('Con', tutorName)}
      ${infoRow('Fecha', date)}
      ${infoRow('Hora', startTime)}
    </table>

    <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:14px 16px; margin-top:20px;">
      <p style="margin:0; color:#1e40af; font-size:14px;">
        Asegurate de tener buena conexion a internet antes de la sesion.
      </p>
    </div>

    ${button('Unirse a la sesion', meetingUrl)}
  `)

module.exports = { sessionBooked, sessionConfirmed, sessionCancelled, sessionReminder }