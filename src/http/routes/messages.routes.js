const router = require('express').Router();
const controller = require('../controllers/messages.controller');
const auth = require('../middleware/auth.middleware');

router.get('/:id', auth, controller.list);

module.exports = router;
