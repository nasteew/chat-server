const router = require('express').Router();
const controller = require('../controllers/chats.controller');
const auth = require('../middleware/auth.middleware');

router.post('/create', auth, controller.create);
router.get('/', auth, controller.list);
router.post('/:chatId/delete', auth, controller.remove);
router.delete('/:chatId', auth, controller.remove);
router.get('/:chatId', auth, controller.getById);

module.exports = router;
