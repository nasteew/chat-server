const bcrypt = require('bcrypt');
const { supabase } = require('../../db/supabase');

exports.findByEmail = async (email) => {
  const { data, error } = await supabase.from('users').select('*').eq('email', email).single();

  if (error) return null;
  return data;
};

exports.findByUsername = async (username) => {
  const { data, error } = await supabase.from('users').select('*').eq('username', username).single();

  if (error) return null;
  return data;
};

exports.findById = async (id) => {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single();

  if (error) return null;
  return data;
};

exports.createUser = async (username, display_name, email, password_hash) => {
  const { data, error } = await supabase
    .from('users')
    .insert([{ username, display_name, email, password_hash }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

exports.deleteUser = async (id) => {
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) throw error;
};

exports.searchUsers = async (query, currentUserId) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url')
    .ilike('username', `%${query}%`)
    .neq('id', currentUserId)
    .limit(20);

  if (error) throw error;
  return data || [];
};

exports.updateUser = async (id, updates) => {
  const updateData = {};

  if (updates.username) updateData.username = updates.username;
  if (updates.display_name) updateData.display_name = updates.display_name;
  if (updates.email) updateData.email = updates.email;
  if (updates.avatar_url) updateData.avatar_url = updates.avatar_url;

  if (updates.password) {
    updateData.password_hash = await bcrypt.hash(updates.password, 10);
  }

  const { data, error } = await supabase.from('users').update(updateData).eq('id', id).select().single();

  if (error) throw error;
  return data;
};

exports.findByUsername = async (username) => {
  const { data } = await supabase.from('users').select('*').eq('username', username).single();

  return data || null;
};

exports.findByEmail = async (email) => {
  const { data } = await supabase.from('users').select('*').eq('email', email).single();

  return data || null;
};
