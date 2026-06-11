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

  const mapped = (messages || []).map((m) => ({
    ...m,
    sender_id: m.sender_id || m.user_id,
    is_read: lastReadId ? m.id <= lastReadId : false,
  }));

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
