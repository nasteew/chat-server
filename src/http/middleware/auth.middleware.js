const { verifyAccess } = require('../../utils/jwt');

module.exports = function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });

    const payload = verifyAccess(token);
    req.user = payload;

    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
