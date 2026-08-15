// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

// attaches `req.user` (safe profile, no password) if token valid
async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload?.userId) return res.status(401).json({ error: 'Unauthorized' });

    const userDoc = await User.findById(payload.userId).lean();
    if (!userDoc) return res.status(401).json({ error: 'Unauthorized' });

    // create a safe user object attached to req (omit password)
    req.user = {
      id: userDoc._id,
      name: userDoc.name || '',
      email: (userDoc.email || '').toLowerCase(),
      role: userDoc.role || 'student',
      branch: userDoc.branch || '',
      semester: userDoc.semester || '',
      section: userDoc.section || '',
      dob: userDoc.dob,
      createdAt: userDoc.createdAt || null
    };

    return next();
  } catch (err) {
    console.error('authMiddleware error:', err.message || err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// optionalAuth: attaches req.user if token present & valid; otherwise continues
async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return next();
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload?.userId) return next();
    const userDoc = await User.findById(payload.userId).lean();
    if (!userDoc) return next();
    req.user = {
      id: userDoc._id,
      name: userDoc.name || '',
      email: (userDoc.email || '').toLowerCase(),
      role: userDoc.role || 'student',
      branch: userDoc.branch || '',
      semester: userDoc.semester || '',
      section: userDoc.section || '',
      dob: userDoc.dob || '',
      createdAt: userDoc.createdAt || null
    };
    return next();
  } catch (e) {
    // ignore auth errors and continue anonymous
    return next();
  }
}

module.exports = { authMiddleware, optionalAuth };

