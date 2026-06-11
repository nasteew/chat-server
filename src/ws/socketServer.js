const { Server } = require('ws');
const { v4: uuid } = require('uuid');
const Connection = require('./connection');
const chatService = require('../http/services/chats.service');

module.exports = function SocketServer(server) {
  const wss = new Server({ server });

  const connections = new Map();

  const userConnections = new Map();

  const offlineTimers = new Map();

  const api = {
    connections,

    userConnections,
    offlineTimers,

    broadcast(type, payload) {
      connections.forEach((conn) => {
        if (conn.isAuthed) {
          conn.send(type, payload);
        }
      });
    },

    broadcastToChat(chatId, type, payload) {
      const normalizedChatId = String(chatId);
      connections.forEach((conn) => {
        if (conn.isAuthed && conn.currentChatId === normalizedChatId) {
          conn.send(type, payload);
        }
      });
    },

    async broadcastToParticipants(chatId, type, payload, excludeUserId = null) {
      const chat = await chatService.getChatById(chatId);
      if (!chat) return;

      const exclude = excludeUserId != null ? String(excludeUserId) : null;

      for (const participantId of chat.participants) {
        const pid = String(participantId);
        if (exclude && pid === exclude) continue;

        const connIds = userConnections.get(pid);
        if (!connIds) continue;

        for (const connId of connIds) {
          const conn = connections.get(connId);
          if (conn?.isAuthed) {
            conn.send(type, payload);
          }
        }
      }
    },
  };

  wss.on('connection', (socket) => {
    const id = uuid();
    const connection = new Connection(socket, id, api);

    connections.set(id, connection);
  });

  return api;
};
