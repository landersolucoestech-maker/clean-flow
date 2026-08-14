import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { getAuthorizedStaffIdentity } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Recipient = {
  id: string;
  broadcast_id: string;
  customer_id: string;
  phone: string | null;
  status: string;
};

type SmsProvider = "ringcentral" | "dialpad";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isAllowedAttachmentUrl(value: string, supabaseUrl: string): boolean {
  try {
    const candidate = new URL(value);
    return candidate.protocol === "https:"
      && candidate.origin === new URL(supabaseUrl).origin
      && candidate.pathname.startsWith("/storage/v1/object/public/broadcast-attachments/");
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Broadcast service is not configured" }, 503);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const authorization = await getAuthorizedStaffIdentity(req, admin, ["admin", "office_manager", "virtual_assistant"]);
    if (authorization.error) return authorization.error;
    const companyId = authorization.identity.companyId;

    const body = await req.json().catch(() => ({}));
    const broadcastId = typeof body.broadcast_id === "string" ? body.broadcast_id : "";
    if (!broadcastId) return json({ error: "broadcast_id is required" }, 400);

    const { data: broadcast, error: broadcastError } = await admin
      .from("broadcast_messages")
      .select("*")
      .eq("id", broadcastId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (broadcastError || !broadcast) return json({ error: "Broadcast not found" }, 404);

    const attachmentUrls: string[] = Array.isArray(broadcast.attachment_urls)
      ? broadcast.attachment_urls.filter((value: unknown): value is string => typeof value === "string")
      : [];
    if (attachmentUrls.some((url) => !isAllowedAttachmentUrl(url, supabaseUrl))) {
      return json({ error: "Broadcast contains an invalid attachment URL" }, 400);
    }

    const { data: recipients, error: recipientsError } = await admin
      .from("broadcast_recipients")
      .select("id, broadcast_id, customer_id, phone, status")
      .eq("broadcast_id", broadcastId)
      .eq("status", "pending");
    if (recipientsError) throw recipientsError;

    let sentCount = 0;
    let failedCount = 0;
    const providerCounts: Record<SmsProvider, number> = { ringcentral: 0, dialpad: 0 };

    for (const recipient of (recipients || []) as Recipient[]) {
      if (!recipient.phone) {
        await admin.from("broadcast_recipients").update({ status: "failed", error_message: "No phone number" }).eq("id", recipient.id);
        failedCount++;
        continue;
      }

      let recipientFailed = false;
      let lastProvider: SmsProvider | null = null;
      let lastProviderMessageId: string | null = null;
      const sends = attachmentUrls.length
        ? attachmentUrls.map((url, index) => ({
            message: index === attachmentUrls.length - 1 ? (broadcast.message || "") : "",
            attachmentUrl: url,
          }))
        : [{ message: broadcast.message || "", attachmentUrl: null }];

      for (const item of sends) {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-sms-message`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            company_id: companyId,
            to_phone: recipient.phone,
            message: item.message,
            attachment_url: item.attachmentUrl,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        const provider = payload?.provider === "dialpad" ? "dialpad" : payload?.provider === "ringcentral" ? "ringcentral" : null;
        if (!response.ok || payload?.success !== true || !provider) {
          const deliveryError = typeof payload?.error === "string" ? payload.error : `SMS gateway HTTP ${response.status}`;
          await admin.from("broadcast_recipients").update({ status: "failed", error_message: deliveryError.slice(0, 500) }).eq("id", recipient.id);
          failedCount++;
          recipientFailed = true;
          break;
        }
        lastProvider = provider;
        lastProviderMessageId = payload?.message_id != null ? String(payload.message_id) : null;
      }

      if (recipientFailed || !lastProvider) continue;

      await admin
        .from("broadcast_recipients")
        .update({ status: "sent", sent_at: new Date().toISOString(), error_message: null })
        .eq("id", recipient.id);

      const { data: conversation } = await admin
        .from("conversations")
        .select("id")
        .eq("company_id", companyId)
        .eq("customer_id", recipient.customer_id)
        .is("staff_id", null)
        .maybeSingle();

      if (conversation) {
        const messageRecord: Record<string, unknown> = {
          conversation_id: conversation.id,
          content: broadcast.message || (attachmentUrls.length ? "📎 Attachment" : ""),
          sender_type: "user",
          attachment_url: attachmentUrls[0] || null,
          provider: lastProvider,
          provider_message_id: lastProviderMessageId,
          delivery_status: "sent",
          delivery_attempts: sends.length,
          last_delivery_attempt_at: new Date().toISOString(),
        };
        if (lastProvider === "ringcentral") messageRecord.ringcentral_message_id = lastProviderMessageId;
        await admin.from("messages").insert(messageRecord);
        await admin.from("conversations").update({
          last_message: broadcast.message || "📎 Attachment",
          last_message_at: new Date().toISOString(),
          unread: false,
        }).eq("id", conversation.id).eq("company_id", companyId);
      }

      providerCounts[lastProvider]++;
      sentCount++;
    }

    const total = recipients?.length || 0;
    const { error: updateError } = await admin
      .from("broadcast_messages")
      .update({
        status: failedCount === total && total > 0 ? "failed" : "completed",
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: sentCount > 0 ? new Date().toISOString() : null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", broadcastId)
      .eq("company_id", companyId);
    if (updateError) throw updateError;

    return json({ success: true, sent_count: sentCount, failed_count: failedCount, total, provider_counts: providerCounts });
  } catch (error) {
    console.error("Broadcast delivery error:", error);
    return json({ error: error instanceof Error ? error.message : "Broadcast delivery failed" }, 500);
  }
});
