import { supabase } from "@/integrations/supabase/client";

export interface BroadcastCustomerRecipient {
  id: string;
  phone?: string | null;
  phone2?: string | null;
}

export async function uploadBroadcastAttachment(companyId: string, file: File, fileName: string) {
  const path = `${companyId}/broadcasts/${crypto.randomUUID()}_${fileName}`;
  const { error } = await supabase.storage.from("broadcast-attachments").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("broadcast-attachments").getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export async function removeBroadcastAttachments(paths: string[]) {
  if (!paths.length) return;
  const { error } = await supabase.storage.from("broadcast-attachments").remove(paths);
  if (error) throw error;
}

export async function sendCustomerBroadcast(
  companyId: string,
  message: string,
  attachmentUrls: string[],
  customers: BroadcastCustomerRecipient[],
) {
  const { data: broadcast, error: broadcastError } = await supabase
    .from("broadcast_messages" as never)
    .insert({
      company_id: companyId,
      message,
      status: "sending",
      total_recipients: customers.length,
      customer_filter: { ids: customers.map((customer) => customer.id) },
      attachment_urls: attachmentUrls,
    } as never)
    .select()
    .single();
  if (broadcastError || !broadcast) throw broadcastError || new Error("Unable to create broadcast");

  const broadcastId = (broadcast as { id: string }).id;
  const recipients = customers.map((customer) => ({
    broadcast_id: broadcastId,
    customer_id: customer.id,
    phone: customer.phone || customer.phone2,
    status: "pending",
  }));
  const { error: recipientError } = await supabase.from("broadcast_recipients" as never).insert(recipients as never);
  if (recipientError) throw recipientError;

  const { data: result, error: sendError } = await supabase.functions.invoke("send-broadcast", {
    body: { broadcast_id: broadcastId },
  });
  if (sendError) throw sendError;
  return {
    sent: Number(result?.sent_count || 0),
    failed: Number(result?.failed_count || 0),
  };
}

export async function sendTeamBroadcastMessage(
  companyId: string,
  phone: string,
  message: string,
  attachmentUrl?: string,
) {
  const { data: result, error } = await supabase.functions.invoke("send-sms-message", {
    body: {
      company_id: companyId,
      to_phone: phone,
      message,
      attachment_url: attachmentUrl,
    },
  });
  if (error || !result?.success) return false;
  return true;
}
