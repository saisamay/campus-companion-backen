// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authController = require('../controllers/authController');
const User = require('../models/User');

const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const rateLimit = require('express-rate-limit');

const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { ok: false, error: 'Too many password reset attempts. Try again later.' },
});

router.post('/forgot-password', forgotLimiter, authController.forgotPassword);

// ✅ FIXED: Helper to build a safe user profile object
function userProfile(userDoc) {
  if (!userDoc) return null;
  return {
    id: userDoc._id,
    name: userDoc.name || '',
    dob: userDoc.dob || '',
    email: (userDoc.email || '').toLowerCase(),
    rollNo: (userDoc.rollNo || '').toUpperCase(),
    role: userDoc.role || 'student',
    branch: userDoc.branch || '',
    semester: userDoc.semester || '',
    section: userDoc.section || '',
    createdAt: userDoc.createdAt || userDoc._doc?.createdAt || null,
    
    // ✅ ADDED THIS LINE: Pulls the URL from the nested profile object
    profile: (userDoc.profile && userDoc.profile.url) ? userDoc.profile.url : null
  };
}

// -----------------
// Register
// -----------------
router.post('/register', async (req, res, next) => {
  try {
    // ✅ FIXED: Added dob and rollNo to destructuring (they were causing crashes before)
    const { name, email, password, branch, semester, section, role, dob, rollNo } = req.body || {};
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, saltRounds);

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      dob: dob, // Make sure your frontend sends this!
      rollNo: rollNo || '', 
      password: hashed,
      branch: branch || '',
      semester: semester || '',
      section: section || '',
      role: role || 'student',
    });

    await user.save();

    const profile = userProfile(user);
    // respond with created profile
    return res.status(201).json({ success: true, user: profile });
  } catch (err) {
    next(err);
  }
});

// -----------------
// Login
// -----------------
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    const payload = { userId: user._id.toString(), role: user.role, email: user.email };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // This will now include the 'profile' field with the URL!
    const profile = userProfile(user);
    return res.json({ token, user: profile });
  } catch (err) {
    next(err);
  }
});

module.exports = router;