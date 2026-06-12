const router = require('express').Router();
const controller = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/register', controller.register);

router.post('/login', controller.login);

router.post('/refresh', controller.refresh);

router.post('/logout', controller.logout);
router.delete('/delete', authMiddleware, controller.deleteAccount);
router.post('/delete', authMiddleware, controller.deleteAccount);

module.exports = router;
