const { supabase } = require('../../db/supabase');

const BUCKET = process.env.SUPABASE_AVATAR_BUCKET || 'avatars';
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function getPublicUrl(path) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Путь в bucket из сохранённого public URL. */
function pathFromPublicUrl(url) {
  if (!url || typeof url !== 'string') return null;

  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;

  return decodeURIComponent(url.slice(idx + marker.length));
}

async function removeStoredFile(path) {
  if (!path) return;

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    console.warn('Avatar delete warning:', error.message);
  }
}

exports.uploadAvatar = async (userId, file) => {
  if (!file?.buffer?.length) {
    throw new Error('No file provided');
  }

  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('Image must be less than 5MB');
  }

  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw new Error('Only JPEG, PNG, WebP and GIF are allowed');
  }

  const ext = EXT_BY_MIME[file.mimetype] || 'jpg';
  const objectPath = `${userId}/avatar.${ext}`;

  const { data: user } = await supabase
    .from('users')
    .select('avatar_url')
    .eq('id', userId)
    .single();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
      cacheControl: '3600',
    });

  if (uploadError) {
    throw new Error(uploadError.message || 'Upload failed');
  }

  const publicUrl = `${getPublicUrl(objectPath)}?t=${Date.now()}`;

  const { data: updated, error: dbError } = await supabase
    .from('users')
    .update({ avatar_url: publicUrl })
    .eq('id', userId)
    .select('id, username, display_name, email, avatar_url')
    .single();

  if (dbError) {
    throw dbError;
  }

  const oldPath = pathFromPublicUrl(user?.avatar_url);
  if (oldPath && oldPath !== objectPath) {
    await removeStoredFile(oldPath);
  }

  return updated;
};

exports.deleteAvatar = async (userId) => {
  const { data: user } = await supabase
    .from('users')
    .select('avatar_url')
    .eq('id', userId)
    .single();

  const oldPath = pathFromPublicUrl(user?.avatar_url);
  if (oldPath) {
    await removeStoredFile(oldPath);
  }

  const { data: updated, error } = await supabase
    .from('users')
    .update({ avatar_url: null })
    .eq('id', userId)
    .select('id, username, display_name, email, avatar_url')
    .single();

  if (error) throw error;
  return updated;
};
