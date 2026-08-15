// utils/mailer.js
const nodemailer = require('nodemailer');

function createTransporter() {
  // If explicit SMTP env exists, use it; otherwise create Ethereal (dev) transport.
  if (process.env.SMTP_HOST && process.env.SMTP_HOST !== 'smtp.example.com') {
    // Real SMTP configured via .env
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: (process.env.SMTP_SECURE === 'true'), // true for 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        // set to false in dev if you need, but prefer true in prod
        rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false'
      }
    });
  }

  // Fallback: create Ethereal transport for dev
  // NOTE: createTestAccount is asynchronous; return a transporter promise
  return (async () => {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  })();
}

async function _getTransporter() {
  const t = createTransporter();
  // If createTransporter returned a Promise (ethereal), await it
  if (t && typeof t.then === 'function') return await t;
  return t;
}

async function sendMail({ to, subject, html, text, from }) {
  const transporter = await _getTransporter();
  const info = await transporter.sendMail({
    from: from || (process.env.SMTP_FROM || 'no-reply@campus.local'),
    to,
    subject,
    text,
    html
  });

  // If using Ethereal / test account, nodemailer provides a preview URL
  try {
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) {
      console.log('Ethereal preview URL:', preview);
    }
  } catch (e) {
    // ignore if not available
  }

  return info;
}

// Convenience function used by your authController
async function sendTemporaryPassword(toEmail, toName, tempPassword) {
  const subject = 'Campus Companion — Temporary password';
  const html = `
    <p>Hi ${toName || ''},</p>
    <p>Your temporary password is: <strong>${tempPassword}</strong></p>
    <p>Please change it after logging in.</p>
    <p>— Campus Companion</p>
  `;
  const text = `Hi ${toName || ''},\n\nYour temporary password is: ${tempPassword}\n\nPlease change it after logging in.\n\n— Campus Companion`;

  return sendMail({ to: toEmail, subject, html, text });
}

module.exports = { sendMail, sendTemporaryPassword, createTransporter };
