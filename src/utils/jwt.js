const jwt = require('jsonwebtoken');

const { ACCESS_SECRET } = process.env;
const { REFRESH_SECRET } = process.env;

exports.generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, login: user.login || user.username },
    ACCESS_SECRET,
    { expiresIn: '15m' }
  );
};

exports.generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: '30d' });
};

exports.verifyAccess = (token) => jwt.verify(token, ACCESS_SECRET);
exports.verifyRefresh = (token) => jwt.verify(token, REFRESH_SECRET);
