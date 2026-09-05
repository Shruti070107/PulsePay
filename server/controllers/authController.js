const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { issueToken } = require('../middleware/auth');

const publicUser = (user) => ({
  id: (user._id || user.id || '').toString(),
  name: user.name,
  email: user.email,
});
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const register = async (req, res, next) => {
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!name || !validEmail(email) || password.length < 8) {
      return res.status(400).json({ success: false, error: { message: 'Enter a name, a valid work email, and a password of at least 8 characters.' } });
    }
    const secret = process.env.JWT_SECRET || 'pulsepay-jwt-secret-key-32-chars-long-2026';
    if (!secret) {
      return res.status(503).json({ success: false, error: { message: 'Account service is temporarily unavailable. Please try again shortly.' } });
    }
    const exists = await User.exists({ email });
    if (exists) return res.status(409).json({ success: false, error: { message: 'An account with this email already exists. Please sign in instead.' } });
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
    return res.status(201).json({ success: true, data: { user: publicUser(user), token: issueToken(user) } });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, error: { message: 'An account with this email already exists. Please sign in instead.' } });
    return next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const body = req.body || {};
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      return res.status(401).json({ success: false, error: { message: 'Email or password is incorrect.' } });
    }

    const secret = process.env.JWT_SECRET || 'pulsepay-jwt-secret-key-32-chars-long-2026';
    if (!secret) {
      return res.status(503).json({ success: false, error: { message: 'Account service is temporarily unavailable. Please try again shortly.' } });
    }

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !user.passwordHash || typeof user.passwordHash !== 'string') {
      return res.status(401).json({ success: false, error: { message: 'Email or password is incorrect.' } });
    }

    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(password, user.passwordHash);
    } catch {
      passwordMatch = false;
    }

    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: { message: 'Email or password is incorrect.' } });
    }

    return res.json({ success: true, data: { user: publicUser(user), token: issueToken(user) } });
  } catch (err) {
    return next(err);
  }
};

const me = async (req, res, next) => {
  try {
    if (!req.user || !req.user.sub) {
      return res.status(401).json({ success: false, error: { message: 'Your session has expired. Please sign in again.' } });
    }
    const user = await User.findById(req.user.sub);
    if (!user) return res.status(401).json({ success: false, error: { message: 'Your session has expired. Please sign in again.' } });
    return res.json({ success: true, data: { user: publicUser(user) } });
  } catch (err) { return next(err); }
};

const logout = (req, res) => res.json({ success: true, data: { message: 'Signed out successfully.' } });
module.exports = { register, login, me, logout };
