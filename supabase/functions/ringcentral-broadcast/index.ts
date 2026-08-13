import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { getAuthorizedStaffIdentity } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const RC_API_BASE = "https://platform.ringcentral.com/restapi/v1.0";
const RC_TOKEN_URL = "https://platform.ringcentral.com/restapi/oauth/token";
const RC_CLIENT_ID = Deno.env.get("RINGCENTRAL_CLIENT_ID");
const RC_CLIENT_SECRET = Deno.env.get("RINGCENTRAL_CLIENT_SECRET");
const RC_FROM_NUMBER = Deno.env.get("RINGCENTRAL_FROM_NUMBER");
const MAX_MMS_SIZE = 1 * 1024 * 1024;

type Recipient = {
  id: string;
  broadcast_id: string;
  customer_id: string;
  phone: string | null;
  status: string;
};

type Connection = {
  id: string;
  company_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  phone_number: string | null;
};

type SendResult = { success: boolean; messageId?: string; error?: string };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("1") && cleaned.length === 11) return `+${cleaned}`;
  if (cleaned.length === 10) return `+1${cleaned}`;
  return `+${cleaned}`;
}

function isAllowedAttachmentUrl(value: string, supabaseUrl: string): boolean {
  try {
    const candidate = new URL(value);
    const storageOrigin = new URL(supabaseUrl).origin;
    return candidate.protocol === "https:"
      && candidate.origin === storageOrigin
      && candidate.pathname.startsWith("/storage/v1/object/public/broadcast-attachments/");
  } catch {
    return false;
  }
}

async function refreshAccessToken(supabase: SupabaseClient, connection: Connection): Promise<string> {
  if (new Date(connection.token_expires_at).getTime() > Date.now() + 60_000) return connection.access_token;
  if (!RC_CLIENT_ID || !RC_CLIENT_SECRET) throw new Error("RingCentral credentials are not configured");

  const response = await fetch(RC_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${RC_CLIENT_ID}:${RC_CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: connection.refresh_token }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.access_token !== "string") {
    throw new Error("Failed to refresh RingCentral token");
  }

  const { error } = await supabase
    .from("ringcentral_connections")
    .update({
      access_token: payload.access_token,
      refresh_token: payload.refresh_token || connection.refresh_token,
      token_expires_at: new Date(Date.now() + Number(payload.expires_in) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id)
    .eq("company_id", connection.company_id);
  if (error) throw new Error("Failed to persist RingCentral token refresh");
  return payload.access_token;
}

async function sendSMS(accessToken: string, from: string, to: string, text: string): Promise<SendResult> {
  try {
    const response = await fetch(`${RC_API_BASE}/account/~/extension/~/sms`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: { phoneNumber: from }, to: [{ phoneNumber: to }], text }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return { success: false, error: `RingCentral HTTP ${response.status}` };
    return { success: true, messageId: typeof payload.id === "string" ? payload.id : undefined };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "RingCentral request failed" };
  }
}

async function fetchAttachment(url: string): Promise<{ base64: string; contentType: string; fileName: string } | null> {
  const head = await fetch(url, { method: "HEAD" }).catch(() => null);
  const size = Number(head?.headers.get("content-length") || 0);
  if (!head?.ok || size === 0 || size > MAX_MMS_SIZE) return null;

  const response = await fetch(url);
  if (!response.ok) return null;
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    const chunk = bytes.subarray(i, Math.min(i + 8192, bytes.length));
    for (const byte of chunk) binary += String.fromCharCode(byte);
  }
  return {
    base64: btoa(binary),
    contentType: response.headers.get("content-type") || "application/octet-stream",
    fileName: decodeURIComponent(new URL(url).pathname.split("/").pop() || "attachment"),
  };
}

async function sendAttachment(
  accessToken: string,
  from: string,
  to: string,
  text: string,
  url: string,
): Promise<SendResult> {
  const attachment = await fetchAttachment(url);
  if (!attachment) {
    return sendSMS(accessToken, from, to, text ? `${text}\n\n📎 ${url}` : `📎 ${url}`);
  }

  const boundary = `----RCBoundary${crypto.randomUUID()}`;
  const body = [
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({
      from: { phoneNumber: from },
      to: [{ phoneNumber: to }],
      text,
    })}\r\n`,
    `--${boundary}\r\nContent-Type: ${attachment.contentType}\r\nContent-Disposition: attachment; filename="${attachment.fileName.replace(/["\r\n]/g, "_")}"\r\nContent-Transfer-Encoding: base64\r\n\r\n${attachment.base64}\r\n`,
    `--${boundary}--\r\n`,
  ].join("");

  const response = await fetch(`${RC_API_BASE}/account/~/extension/~/sms`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": `multipart/mixed; boundary=${boundary}` },
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return { success: false, error: `RingCentral HTTP ${response.status}` };
  return { success: true, messageId: typeof payload.id === "string" ? payload.id : undefined };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const authorization = await getAuthorizedStaffIdentity(
      req,
      supabase,
      ["admin", "office_manager", "virtual_assistant"],
    );
    if (authorization.error) return authorization.error;
    const companyId = authorization.identity.companyId;

    const { broadcast_id } = await req.json();
    if (typeof broadcast_id !== "string" || !broadcast_id) return json({ error: "broadcast_id is required" }, 400);

    const { data: broadcast, error: broadcastError } = await supabase
      .from("broadcast_messages")
      .select("*")
      .eq("id", broadcast_id)
      .eq("company_id", companyId)
      .maybeSingle();
    if (broadcastError || !broadcast) return json({ error: "Broadcast not found" }, 404);

    const attachmentUrls = Array.isArray(broadcast.attachment_urls)
      ? broadcast.attachment_urls.filter((value: unknown): value is string => typeof value === "string")
      : [];
    if (attachmentUrls.some((url) => !isAllowedAttachmentUrl(url, supabaseUrl))) {
      return json({ error: "Broadcast contains an invalid attachment URL" }, 400);
    }

    const { data: connection, error: connectionError } = await supabase
      .from("ringcentral_connections")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle();
    if (connectionError || !connection) return json({ error: "RingCentral is not connected" }, 409);

    const accessToken = await refreshAccessToken(supabase, connection as Connection);
    const fromNumber = connection.phone_number || RC_FROM_NUMBER;
    if (!fromNumber) return json({ error: "No SMS phone number configured" }, 400);

    const { data: recipients, error: recipientsError } = await supabase
      .from("broadcast_recipients")
      .select("*")
      .eq("broadcast_id", broadcast_id)
      .eq("status", "pending");
    if (recipientsError) throw recipientsError;

    let sentCount = 0;
    let failedCount = 0;
    for (const recipient of (recipients || []) as Recipient[]) {
      if (!recipient.phone) {
        await supabase.from("broadcast_recipients").update({ status: "failed", error_message: "No phone number" }).eq("id", recipient.id);
        failedCount++;
        continue;
      }

      const phone = formatPhoneNumber(recipient.phone);
      let result: SendResult = { success: false, error: "No message attempted" };
      if (attachmentUrls.length === 0) {
        result = await sendSMS(accessToken, fromNumber, phone, broadcast.message || "");
      } else {
        for (let i = 0; i < attachmentUrls.length; i++) {
          result = await sendAttachment(
            accessToken,
            fromNumber,
            phone,
            i === attachmentUrls.length - 1 ? (broadcast.message || "") : "",
            attachmentUrls[i],
          );
          if (!result.success) break;
        }
      }

      if (!result.success) {
        await supabase
          .from("broadcast_recipients")
          .update({ status: "failed", error_message: (result.error || "Unknown error").slice(0, 500) })
          .eq("id", recipient.id);
        failedCount++;
        continue;
      }

      await supabase
        .from("broadcast_recipients")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", recipient.id);

      const { data: conversation } = await supabase
        .from("conversations")
        .select("id")
        .eq("company_id", companyId)
        .eq("customer_id", recipient.customer_id)
        .maybeSingle();
      if (conversation) {
        await supabase.from("messages").insert({
          conversation_id: conversation.id,
          content: broadcast.message || "",
          sender_type: "user",
          attachment_url: attachmentUrls[0] || null,
          ringcentral_message_id: result.messageId || null,
        });
      }
      sentCount++;
    }

    const total = recipients?.length || 0;
    await supabase
      .from("broadcast_messages")
      .update({
        status: failedCount === total && total > 0 ? "failed" : "completed",
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: sentCount > 0 ? new Date().toISOString() : null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", broadcast_id)
      .eq("company_id", companyId);

    return json({ success: true, sent_count: sentCount, failed_count: failedCount, total });
  } catch (error) {
    console.error("Broadcast error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
