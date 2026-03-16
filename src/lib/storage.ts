import { supabase } from '@/integrations/supabase/client';

export async function uploadMenuImage(file: File, folder: string): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from('menu-images')
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  const { data } = supabase.storage.from('menu-images').getPublicUrl(fileName);
  return data.publicUrl;
}

export async function deleteMenuImage(url: string): Promise<void> {
  // Extract path from public URL
  const match = url.match(/menu-images\/(.+)$/);
  if (!match) return;
  await supabase.storage.from('menu-images').remove([match[1]]);
}
