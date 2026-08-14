import { supabase } from "@/integrations/supabase/client";

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
}

export async function uploadMessageAttachment(conversationId: string, file: File) {
  const fileName = `${conversationId}/${Date.now()}_${sanitizeFileName(file.name)}`;
  const { data, error } = await supabase.storage.from("message-attachments").upload(fileName, file);
  if (error) throw error;
  const { data: publicUrl } = supabase.storage.from("message-attachments").getPublicUrl(data.path);
  return publicUrl.publicUrl;
}
