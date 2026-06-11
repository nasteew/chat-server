const onlineService = require('../services/online.service');

exports.getOnlineUsers = (req, res) => {
  try {
    const server = req.app.get('wsServer');
    const online = onlineService.getOnlineUsers(server);

    return res.json({ online });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get online users' });
  }
};
