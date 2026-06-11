const bcrypt = require('bcrypt');
const userService = require('../services/user.service');
const avatarService = require('../services/avatar.service');
const { AppError } = require('../middleware/error.middleware');

exports.search = async (req, res, next) => {
  try {
    const query = req.query.query || '';
    const currentUserId = req.user.id;

    const users = await userService.searchUsers(query, currentUserId);

    return res.json(users);
  } catch (e) {
    next(e);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await userService.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return res.json({ id: user.id, login: user.login });
  } catch (e) {
    next(e);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { username, display_name, email, password, currentPassword, avatar_url } = req.body;

    // Нечего обновлять
    if (!username && !display_name && !email && !password && !avatar_url) {
      throw new AppError('No fields to update', 400);
    }

    // Проверка username на уникальность
    if (username) {
      const existing = await userService.findByUsername(username);
      if (existing && existing.id !== userId) {
        throw new AppError('Username already taken', 409);
      }
    }

    // Проверка email на уникальность
    if (email) {
      const existing = await userService.findByEmail(email);
      if (existing && existing.id !== userId) {
        throw new AppError('Email already taken', 409);
      }
    }

    // Проверка текущего пароля перед сменой
    if (password) {
      if (!currentPassword) {
        throw new AppError('Current password required', 400);
      }

      const user = await userService.findById(userId);
      const ok = await bcrypt.compare(currentPassword, user.password_hash);

      if (!ok) {
        throw new AppError('Current password is incorrect', 401);
      }
    }

    // Обновление
    const updatedUser = await userService.updateUser(userId, {
      username,
      display_name,
      email,
      password,
      avatar_url,
    });

    return res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      display_name: updatedUser.display_name,
      email: updatedUser.email,
      avatar_url: updatedUser.avatar_url,
    });
  } catch (e) {
    next(e);
  }
};

exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('Avatar file is required', 400);
    }

    const user = await avatarService.uploadAvatar(req.user.id, req.file);

    return res.json({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      email: user.email,
      avatar_url: user.avatar_url,
    });
  } catch (e) {
    next(e instanceof AppError ? e : new AppError(e.message || 'Upload failed', 400));
  }
};

exports.deleteAvatar = async (req, res, next) => {
  try {
    const user = await avatarService.deleteAvatar(req.user.id);

    return res.json({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      email: user.email,
      avatar_url: user.avatar_url,
    });
  } catch (e) {
    next(e instanceof AppError ? e : new AppError(e.message || 'Delete failed', 500));
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const userId = req.params.id;

    const user = await userService.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    return res.json({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      email: user.email,
      avatar_url: user.avatar_url,
    });
  } catch (e) {
    next(e);
  }
};
