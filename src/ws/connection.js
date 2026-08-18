const messageService = require('../http/services/messages.service');
const chatService = require('../http/services/chats.service');
const { verifyAccess } = require('../utils/jwt');
const { supabase } = require('../db/supabase');
const { createSequentialQueue } = require('./sequentialQueue');

class Connection {
  constructor(socket, id, server) {
    this.socket = socket;
    this.id = id;
    this.server = server;

    this.userId = null;
    this.currentChatId = null;
    this.isAuthed = false;
    this.enqueue = createSequentialQueue();

    this.socket.on('message', (raw) => {
      this.enqueue(() => this.handleMessage(raw));
    });

    this.socket.on('close', () => {
      this.handleDisconnect();
      this.server.connections.delete(this.id);
    });
  }
  send(type, payload) {
    this.socket.send(JSON.stringify({ type, payload }));
  }
  handleDisconnect() {
    if (!this.userId) return;

    const { userConnections, offlineTimers } = this.server;

    const set = userConnections.get(this.userId);
    if (set) {
      set.delete(this.id);
      if (set.size === 0) {
        offlineTimers.set(
          this.userId,
          setTimeout(() => {
            const stillConnected = userConnections.get(this.userId);

            if (!stillConnected || stillConnected.size === 0) {
              this.server.broadcast('USER_OFFLINE', {
                user_id: this.userId,
              });
            }
          }, 5000)
        );
      }
    }

    if (this.currentChatId) {
      this.server.broadcastToChat(this.currentChatId, 'USER_STOPPED_TYPING', {
        sender_id: this.userId,
        chat_id: this.currentChatId,
      });
    }
  }
  async handleMessage(raw) {
    let msg;

    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'AUTH': {
        try {
          const payload = verifyAccess(msg.payload.token);

          this.userId = String(payload.id);
          this.isAuthed = true;

          clearTimeout(this.server.offlineTimers.get(this.userId));
          this.server.offlineTimers.delete(this.userId);

          if (!this.server.userConnections.has(this.userId)) {
            this.server.userConnections.set(this.userId, new Set());
          }

          this.server.userConnections.get(this.userId).add(this.id);

          this.send('AUTH_SUCCESS', {
            sender_id: this.userId,
          });

          this.server.broadcast('USER_ONLINE', {
            user_id: this.userId,
          });
        } catch {
          this.send('AUTH_FAILURE', { reason: 'invalid_token' });
          this.socket.close();
        }

        break;
      }

      case 'CHAT_OPEN': {
        if (!this.isAuthed) return;

        const chat = await chatService.getChatById(msg.payload.chat_id);
        if (!chat) return;

        if (!chat.participants.map(String).includes(this.userId)) return;

        this.currentChatId = String(chat.id);
        break;
      }

      case 'MSG_SEND': {
        if (!this.isAuthed) return;

        const { chat_id, content, temp_id } = msg.payload;

        try {
          const chat = await chatService.getChatById(chat_id);
          if (!chat) return;

          if (!chat.participants.map(String).includes(this.userId)) return;

          const saved = await messageService.saveMessage({
            chat_id,
            content,
            sender_id: this.userId,
          });

          await this.server.broadcastToParticipants(saved.chat_id, 'MSG_NEW', {
            ...saved,
            sender_id: this.userId,
            temp_id,
          });
        } catch (err) {
          console.error('MSG_SEND failed:', err);
          this.send('MSG_ERROR', {
            code: 'MSG_SEND_FAILED',
            chat_id,
            temp_id,
            message: 'Failed to send message',
          });
        }

        break;
      }

      case 'MSG_EDIT': {
        if (!this.isAuthed) return;

        const { chat_id, message_id, content } = msg.payload;

        const chat = await chatService.getChatById(chat_id);
        if (!chat) return;
        if (!chat.participants.map(String).includes(this.userId)) return;

        const updated = await messageService.editMessage(message_id, this.userId, content);
        if (!updated) return;

        await this.server.broadcastToParticipants(chat_id, 'MSG_EDITED', {
          chat_id,
          message_id,
          content: updated.content,
          is_edited: true,
        });

        break;
      }

      case 'MSG_DELETE': {
        if (!this.isAuthed) return;

        const { chat_id, message_id } = msg.payload;

        const { data: message } = await supabase.from('messages').select('*').eq('id', message_id).single();

        if (!message) return;
        if (message.sender_id !== this.userId) return;

        await supabase
          .from('messages')
          .update({
            is_deleted: true,
            content: 'Message deleted',
          })
          .eq('id', message_id);

        await this.server.broadcastToParticipants(chat_id, 'MSG_DELETED', {
          chat_id,
          message_id,
        });

        break;
      }

      case 'MESSAGES_READ': {
        if (!this.isAuthed) return;

        const { chat_id, last_read_message_id } = msg.payload;

        const lastMsg = await chatService.markChatRead(chat_id, this.userId, last_read_message_id);

        await this.server.broadcastToParticipants(chat_id, 'MESSAGES_READ_ACK', {
          chat_id,
          sender_id: this.userId,
          last_read_message_id: lastMsg?.id ?? null,
          last_read_created_at: lastMsg?.created_at ?? null,
        });

        break;
      }

      case 'TYPING_START': {
        if (!this.isAuthed) return;

        const { chat_id } = msg.payload;
        const chat = await chatService.getChatById(chat_id);
        if (!chat || !chat.participants.map(String).includes(this.userId)) return;

        await this.server.broadcastToParticipants(
          chat_id,
          'USER_TYPING',
          { sender_id: this.userId, chat_id },
          this.userId
        );

        break;
      }

      case 'TYPING_STOP': {
        if (!this.isAuthed) return;

        const { chat_id } = msg.payload;
        const chat = await chatService.getChatById(chat_id);
        if (!chat || !chat.participants.map(String).includes(this.userId)) return;

        await this.server.broadcastToParticipants(
          chat_id,
          'USER_STOPPED_TYPING',
          { sender_id: this.userId, chat_id },
          this.userId
        );

        break;
      }

      default:
        break;
    }
  }
}

module.exports = Connection;
