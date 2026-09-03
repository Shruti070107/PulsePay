const jwt = require('jsonwebtoken');

const getSecret = () => process.env.JWT_SECRET;

const issueToken = (user) => jwt.sign({ sub: user._id.toString(), email: user.email }, getSecret(), { expiresIn: '8h' });

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Your session has expired. Please sign in again.' } });
  try {
    req.user = jwt.verify(token, getSecret());
    return next();
  } catch {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Your session has expired. Please sign in again.' } });
  }
};

module.exports = { issueToken, requireAuth };
