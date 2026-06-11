const router = require('express').Router();
const controller = require('../controllers/users.controller');
const authenticate = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');

router.get('/search', authenticate, controller.search);
router.get('/me', authenticate, controller.getProfile);
router.put('/profile', authenticate, controller.updateProfile);
router.post('/avatar', authenticate, upload.single('avatar'), controller.uploadAvatar);
router.delete('/avatar', authenticate, controller.deleteAvatar);
router.get('/:id', authenticate, controller.getUserById);

module.exports = router;
