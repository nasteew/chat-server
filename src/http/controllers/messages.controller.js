const messageService = require('../services/messages.service');
const chatService = require('../services/chats.service');

exports.list = async (req, res) => {
  try {
    const chatId = req.params.id;
    const userId = req.user.id;

    const chat = await chatService.getChatById(chatId);

    if (!chat) {
      return res.status(404).json({
        error: 'Chat not found',
      });
    }

    const isParticipant = chat.participants.includes(userId);

    if (!isParticipant) {
      return res.status(403).json({
        error: 'Access denied',
      });
    }

    const result = await messageService.getMessages(chatId, userId);

    return res.json(result);
  } catch {
    return res.status(500).json({
      error: 'Failed to load messages',
    });
  }
};
