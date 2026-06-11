const { supabase } = require('../../db/supabase');

exports.findChatBetween = async (userA, userB) => {
  const { data, error } = await supabase.from('chats').select('*').contains('participants', [userA, userB]);

  if (error) throw error;

  if (!data || data.length === 0) return null;

  return data[0];
};

exports.createChat = async (userA, userB) => {
  if (!userA || !userB) {
    throw new Error('Invalid participants');
  }

  const participants = [userA, userB].sort();

  const existing = await exports.findChatBetween(...participants);
  if (existing) return existing;

  const { data, error } = await supabase.from('chats').insert([{ participants }]).select().single();

  if (error) throw error;
  return data;
};

exports.getUserChats = async (userId) => {
  // 1. Чаты пользователя
  const { data: chats, error } = await supabase
    .from('chats')
    .select('*')
    .contains('participants', [String(userId)]);

  if (error) throw error;
  if (!chats || chats.length === 0) return [];

  // 2. Все пользователи
  const { data: allUsers } = await supabase.from('users').select('id, username, display_name, avatar_url');

  const usersMap = Object.fromEntries(allUsers.map((u) => [u.id, u]));

  // 3. chat_reads для пользователя
  const { data: reads } = await supabase
    .from('chat_reads')
    .select('chat_id, last_read_message_id')
    .eq('user_id', userId);

  const readMap = Object.fromEntries((reads || []).map((r) => [r.chat_id, r.last_read_message_id]));

  // 4. Последние сообщения по чатам
  const chatIds = chats.map((c) => c.id);

  const { data: lastMessages } = await supabase
    .from('messages')
    .select('id, chat_id, sender_id, content, is_deleted, created_at')
    .in('chat_id', chatIds)
    .order('created_at', { ascending: false });

  const lastMap = {};
  (lastMessages || []).forEach((m) => {
    if (!lastMap[m.chat_id]) lastMap[m.chat_id] = m;
  });

  // 5. Берём created_at для last_read_message_id
  const lastReadIds = (reads || []).map((r) => r.last_read_message_id).filter(Boolean);

  let lastReadCreatedMap = {};
  if (lastReadIds.length > 0) {
    const { data: lastReadMessages } = await supabase
      .from('messages')
      .select('id, chat_id, created_at')
      .in('id', lastReadIds);

    lastReadCreatedMap = Object.fromEntries((lastReadMessages || []).map((m) => [m.chat_id, m.created_at]));
  }

  // 6. Все сообщения для подсчёта непрочитанных
  const { data: unreadRows } = await supabase
    .from('messages')
    .select('chat_id, sender_id, created_at')
    .in('chat_id', chatIds)
    .neq('sender_id', userId);

  const unreadMap = {};

  (unreadRows || []).forEach((m) => {
    const lastReadAt = lastReadCreatedMap[m.chat_id] || null;

    if (!lastReadAt || m.created_at > lastReadAt) {
      unreadMap[m.chat_id] = (unreadMap[m.chat_id] || 0) + 1;
    }
  });

  // 7. Финальный результат
  return chats.map((chat) => ({
    ...chat,
    participantDetails: chat.participants.map((id) => usersMap[id]).filter(Boolean),
    lastMessage: lastMap[chat.id] || null,
    unreadCount: unreadMap[chat.id] || 0,
  }));
};

exports.getChatById = async (chatId) => {
  const { data: chat, error } = await supabase.from('chats').select('*').eq('id', chatId).single();

  if (error) return null;

  // Получаем данные участников
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url')
    .in('id', chat.participants);

  if (!usersError && users) {
    const usersMap = new Map();
    users.forEach((u) => usersMap.set(u.id, u));
    chat.participantDetails = chat.participants.map((id) => usersMap.get(id)).filter(Boolean);
  }

  return chat;
};

exports.markChatRead = async (chatId, userId) => {
  const { data: lastMsg } = await supabase
    .from('messages')
    .select('id, created_at')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!lastMsg) return null;

  console.log('➡ updating chat_reads for', { chatId, userId, lastMsg });
  await supabase.from('chat_reads').upsert(
    {
      chat_id: chatId,
      user_id: userId,
      last_read_message_id: lastMsg.id,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'chat_id,user_id',
    }
  );

  const { data: check } = await supabase.from('chat_reads').select('*').eq('chat_id', chatId).eq('user_id', userId);

  console.log('➡ chat_reads after update:', check);

  return lastMsg;
};

exports.deleteChat = async (chatId, userId) => {
  const chat = await exports.getChatById(chatId);
  if (!chat) {
    const err = new Error('Chat not found');
    err.statusCode = 404;
    throw err;
  }

  const isParticipant = chat.participants.map(String).includes(String(userId));
  if (!isParticipant) {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }

  const { error: messagesError } = await supabase
    .from('messages')
    .delete()
    .eq('chat_id', chatId);

  if (messagesError) throw messagesError;

  const { error: readsError } = await supabase
    .from('chat_reads')
    .delete()
    .eq('chat_id', chatId);

  if (readsError) throw readsError;

  const { error: chatError } = await supabase.from('chats').delete().eq('id', chatId);

  if (chatError) throw chatError;

  return { ok: true };
};
