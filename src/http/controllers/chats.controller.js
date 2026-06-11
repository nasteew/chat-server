const chatService = require('../services/chats.service');

exports.create = async (req, res) => {
  try {
    const currentUser = req.user.id;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const existing = await chatService.findChatBetween(currentUser, userId);
    if (existing) {
      const full = await chatService.getChatById(existing.id);
      return res.json(full ?? existing);
    }

    const chat = await chatService.createChat(currentUser, userId);
    const full = await chatService.getChatById(chat.id);
    return res.json(full ?? chat);
  } catch (err) {
    console.error('Chat creation error:', err);
    return res.status(500).json({ error: 'Chat creation failed' });
  }
};

exports.list = async (req, res) => {
  try {
    const userId = req.user.id;
    const chats = await chatService.getUserChats(userId);
    return res.json(chats);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: err.message,
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await chatService.getChatById(chatId);

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const isParticipant = chat.participants
      .map(String)
      .includes(String(req.user.id));

    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return res.json(chat);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const { chatId } = req.params;
    await chatService.deleteChat(chatId, req.user.id);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message || 'Delete failed' });
  }
};
