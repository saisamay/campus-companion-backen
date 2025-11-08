// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');

const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);

// Register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, branch, semester, section } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password are required' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, saltRounds);

    const user = new User({
      name,
      email,
      password: hashed,
      branch: branch || null,
      semester: semester || null,
      section: section || null
    });

    await user.save();
    // Do not return password
    res.status(201).json({ user: { id: user._id, name: user.name, email: user.email, role: user.role }});
  } catch (err) {
    next(err);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    const payload = { userId: user._id.toString(), role: user.role, email: user.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
