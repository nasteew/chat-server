const bcrypt = require('bcrypt');
const userService = require('./user.service');
const { generateAccessToken, generateRefreshToken, verifyRefresh } = require('../../utils/jwt');

exports.login = async (email, password) => {
  const user = await userService.findByEmail(email);
  if (!user) throw new Error('User not found');

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new Error('Invalid credentials');

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return { user, accessToken, refreshToken };
};

exports.register = async (username, display_name, email, password) => {
  const existingEmail = await userService.findByEmail(email);
  if (existingEmail) throw new Error('Email already exists');

  const existingUsername = await userService.findByUsername(username);
  if (existingUsername) throw new Error('Username already exists');

  const hash = await bcrypt.hash(password, 10);
  const user = await userService.createUser(username, display_name, email, hash);

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return { user, accessToken, refreshToken };
};

exports.refresh = async (refreshToken) => {
  const payload = verifyRefresh(refreshToken);
  const user = await userService.findById(payload.id);

  const accessToken = generateAccessToken(user);
  return { user, accessToken };
};
