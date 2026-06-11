const router = require('express').Router();
const controller = require('../controllers/online.controller');

router.get('/', controller.getOnlineUsers);

module.exports = router;
