const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { issueToken } = require('../middleware/auth');

const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email });
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const register = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!name || !validEmail(email) || password.length < 8) {
      return res.status(400).json({ success: false, error: { message: 'Enter a name, a valid work email, and a password of at least 8 characters.' } });
    }
    if (!process.env.JWT_SECRET) {
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
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ success: false, error: { message: 'Email or password is incorrect.' } });
    }
    return res.json({ success: true, data: { user: publicUser(user), token: issueToken(user) } });
  } catch (err) { return next(err); }
};

const me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user) return res.status(401).json({ success: false, error: { message: 'Your session has expired. Please sign in again.' } });
    return res.json({ success: true, data: { user: publicUser(user) } });
  } catch (err) { return next(err); }
};

const logout = (req, res) => res.json({ success: true, data: { message: 'Signed out successfully.' } });
module.exports = { register, login, me, logout };
