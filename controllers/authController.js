// controllers/authController.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const { sendTemporaryPassword } = require('../utils/mailer'); // expected signature: (toEmail, toName, tempPassword)

const TEMP_PASS_LENGTH = 10;
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

/** generate a reasonably strong temporary password */
function generateTempPassword(len = TEMP_PASS_LENGTH) {
  return crypto.randomBytes(len).toString('base64').replace(/\W/g, '').slice(0, len);
}

/** normalize a date-like value to YYYY-MM-DD when possible */
function normalizeDate(d) {
  if (!d) return null;
  if (d instanceof Date && !isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  if (typeof d === 'number' && Number.isFinite(d)) {
    const dt = new Date(d);
    if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  }
  const s = String(d).trim();
  // try parse
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return s.toLowerCase();
}

/**
 * Create a transporter:
 * - If SMTP env provided, use that
 * - Otherwise create an Ethereal test account (dev) and return a working transporter
 */
async function createTransporterWithFallback() {
  const host = process.env.SMTP_HOST;
  if (host && host !== 'smtp.example.com') {
    // use configured SMTP
    return nodemailer.createTransport({
      host: host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: (process.env.SMTP_SECURE === 'true'),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: { rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false' }
    });
  }

  // Fallback: Ethereal test account for development
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass }
  });
}

/**
 * POST /api/auth/forgot-password
 * Body: { email: '...', dob: 'YYYY-MM-DD' }
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email, dob } = req.body || {};

    if (!email || !dob) {
      return res.status(400).json({ ok: false, error: 'email and dob are required' });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: emailNorm }).exec();

    if (!user) {
      return res.status(404).json({ ok: false, error: 'No user found with that email and dob' });
    }

    const userDob = user.dob || user.dateOfBirth || user.DOB;
    if (!userDob) {
      return res.status(400).json({ ok: false, error: 'User does not have DOB set' });
    }

    const givenDobNorm = normalizeDate(dob);
    const storedDobNorm = normalizeDate(userDob);
    if (!givenDobNorm || !storedDobNorm || givenDobNorm !== storedDobNorm) {
      return res.status(404).json({ ok: false, error: 'No user found with that email and dob' });
    }

    // Generate and hash temp password
    const tempPassword = generateTempPassword();
    const previousHashed = user.password;
    const newHashed = await bcrypt.hash(String(tempPassword), BCRYPT_SALT_ROUNDS);
    user.password = newHashed;

    // Save change before sending mail. We'll rollback if mail fails.
    await user.save();

    // Try helper first (expected signature: sendTemporaryPassword(toEmail, toName, tempPassword))
    let mailInfo = null;
    if (typeof sendTemporaryPassword === 'function') {
      try {
        mailInfo = await sendTemporaryPassword(user.email, user.name || '', tempPassword);
        // If helper returns info, log it (it might also print ethereal url).
        console.info('forgotPassword: sent via helper', mailInfo && typeof mailInfo === 'object' ? (mailInfo.messageId || mailInfo) : mailInfo);
        return res.json({ ok: true, message: 'Temporary password sent to the provided email.' });
      } catch (helperErr) {
        console.error('forgotPassword: sendTemporaryPassword helper failed:', helperErr);
        // fall through to fallback transporter
      }
    }

    // Fallback: build transporter (Ethereal if no SMTP configured)
    const transporter = await createTransporterWithFallback();
    const fromAddr = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@campus.local';
    const subject = process.env.FORGOT_SUBJECT || 'Your temporary password';
    const text = `Hello ${user.name || ''},

A temporary password has been created for your account. Please use this to sign in and change your password immediately:

Temporary password: ${tempPassword}

If you did not request this, please contact the administrator.

Regards,
Campus Companion`;

    const html = `<p>Hello ${user.name || ''},</p>
<p>A temporary password has been created for your account. Please use this to sign in and change your password immediately:</p>
<p><strong>Temporary password:</strong> ${tempPassword}</p>
<p>If you did not request this, please contact the administrator.</p>
<p>Regards,<br/>Campus Companion</p>`;

    try {
      mailInfo = await transporter.sendMail({ from: fromAddr, to: user.email, subject, text, html });
      console.info('forgotPassword: mail sent fallback, info=', mailInfo);
      // If using Ethereal you can show url:
      try {
        const preview = nodemailer.getTestMessageUrl(mailInfo);
        if (preview) console.info('Ethereal preview URL:', preview);
      } catch (_) {}
      return res.json({ ok: true, message: 'Temporary password sent to the provided email.' });
    } catch (mailErr) {
      console.error('forgotPassword: transporter.sendMail failed:', mailErr);
      // rollback password to previous hash
      try {
        user.password = previousHashed;
        await user.save();
        console.info('forgotPassword: rolled back password change due to mail failure');
      } catch (rbErr) {
        console.error('forgotPassword: rollback failed:', rbErr);
      }
      return res.status(500).json({ ok: false, error: 'Failed to send email. Please try again later.' });
    }
  } catch (err) {
    console.error('forgotPassword: unexpected error:', err);
    next(err);
  }
};
