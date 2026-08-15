// testEmail.js
require('dotenv').config();
const nodemailer = require('nodemailer');

async function sendTest() {
  const host = process.env.SMTP_HOST || '';
  const isPlaceholder = host.includes('example') || host.trim() === '';
  let transporter;

  if (isPlaceholder) {
    console.log('No real SMTP configured — creating Ethereal test account (dev).');
    const testAcct = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAcct.smtp.host,
      port: testAcct.smtp.port,
      secure: testAcct.smtp.secure,
      auth: { user: testAcct.user, pass: testAcct.pass }
    });
    console.log('Ethereal account created, user:', testAcct.user);
  } else {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: (process.env.SMTP_SECURE === 'true'),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: { rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false' }
    });
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com',
    to: process.env.TEST_TO || 'your-email@example.com',
    subject: 'Test email from Campus Companion',
    text: 'This is a test email from your Node server.',
    html: '<p>This is a <b>test email</b> from your Node server.</p>'
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('send succeeded, info:', info);
    if (info && info.messageId && info.response === undefined && info.envelope) {
      // Ethereal returns preview URL
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
  } catch (err) {
    console.error('send failed:', err);
  }
}

sendTest().catch(err => console.error(err));
