const authService = require('../services/auth.service');
const userService = require('../services/user.service');

function getRefreshCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  };
}

exports.register = async (req, res) => {
  try {
    const { username, display_name, email, password } = req.body;

    const { user, accessToken, refreshToken } = await authService.register(username, display_name, email, password);

    res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

    return res.json({ accessToken, user });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { user, accessToken, refreshToken } = await authService.login(email, password);

    res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

    return res.json({ accessToken, user });
  } catch (error) {
    return res.status(401).json({ error: error.message });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(204).end();
    }

    const { user, accessToken } = await authService.refresh(refreshToken);

    return res.json({ accessToken, user });
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('refreshToken', getRefreshCookieOptions());

  return res.json({ ok: true });
};

exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    await userService.deleteUser(userId);

    res.clearCookie('refreshToken', getRefreshCookieOptions());

    return res.json({ ok: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({ error: error.message || 'Delete failed' });
  }
};
