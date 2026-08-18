const { supabase } = require('../../db/supabase');

exports.getMessages = async (chatId, userId) => {
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (msgError) throw msgError;

  const { data: readRow } = await supabase
    .from('chat_reads')
    .select('last_read_message_id')
    .eq('chat_id', chatId)
    .eq('user_id', userId)
    .single();

  const lastReadId = readRow?.last_read_message_id || null;

  const { data: chat } = await supabase.from('chats').select('participants').eq('id', chatId).single();

  const otherUserId = (chat?.participants || []).find((p) => String(p) !== String(userId));

  let otherLastReadCreatedAt = null;

  if (otherUserId) {
    const { data: otherRead } = await supabase
      .from('chat_reads')
      .select('last_read_message_id')
      .eq('chat_id', chatId)
      .eq('user_id', otherUserId)
      .single();

    if (otherRead?.last_read_message_id) {
      const { data: readMsg } = await supabase
        .from('messages')
        .select('created_at')
        .eq('id', otherRead.last_read_message_id)
        .single();

      otherLastReadCreatedAt = readMsg?.created_at ?? null;
    }
  }

  const mapped = (messages || []).map((m) => {
    const senderId = m.sender_id || m.user_id;
    const isMine = String(senderId) === String(userId);
    let is_read = false;

    if (isMine && otherLastReadCreatedAt) {
      is_read = m.created_at <= otherLastReadCreatedAt;
    }

    return {
      ...m,
      sender_id: senderId,
      is_read,
    };
  });

  return {
    messages: mapped,
    lastReadMessageId: lastReadId,
  };
};

exports.saveMessage = async (msg) => {
  const { data, error } = await supabase.from('messages').insert([msg]).select().single();

  if (error) throw error;
  return data;
};

exports.editMessage = async (messageId, userId, content) => {
  const trimmed = content?.trim();
  if (!trimmed) return null;

  const { data: message, error: fetchError } = await supabase.from('messages').select('*').eq('id', messageId).single();

  if (fetchError || !message) return null;
  if (String(message.sender_id) !== String(userId)) return null;
  if (message.is_deleted) return null;

  const { data, error } = await supabase
    .from('messages')
    .update({
      content: trimmed,
      is_edited: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', messageId)
    .select()
    .single();

  if (error) throw error;
  return data;
};
