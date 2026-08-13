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
const MAX_MMS_SIZE = 1 * 1024 * 1024;

type Connection = {
  company_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  phone_number: string | null;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function resolveCompanyId(req: Request, supabase: SupabaseClient, requestedCompanyId: unknown): Promise<string | Response> {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (serviceRoleKey && token === serviceRoleKey) {
    if (typeof requestedCompanyId !== "string" || !requestedCompanyId) return json({ error: "company_id is required" }, 400);
    return requestedCompanyId;
  }

  const authorization = await getAuthorizedStaffIdentity(
    req,
    supabase,
    ["admin", "cleaning_manager", "office_manager", "virtual_assistant"],
  );
  if (authorization.error) return authorization.error;
  if (requestedCompanyId && requestedCompanyId !== authorization.identity.companyId) {
    return json({ error: "Cross-company messaging is not allowed" }, 403);
  }
  return authorization.identity.companyId;
}

async function getValidToken(supabase: SupabaseClient, connection: Connection): Promise<string> {
  if (new Date(connection.token_expires_at).getTime() > Date.now() + 5 * 60_000) return connection.access_token;
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
  if (!response.ok || typeof payload.access_token !== "string") throw new Error("Failed to refresh RingCentral token");

  const { error } = await supabase
    .from("ringcentral_connections")
    .update({
      access_token: payload.access_token,
      refresh_token: payload.refresh_token || connection.refresh_token,
      token_expires_at: new Date(Date.now() + Number(payload.expires_in) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", connection.company_id);
  if (error) throw new Error("Failed to persist refreshed RingCentral token");
  return payload.access_token;
}

function isAllowedAttachmentUrl(value: string, supabaseUrl: string): boolean {
  try {
    const candidate = new URL(value);
    const storageOrigin = new URL(supabaseUrl).origin;
    return candidate.protocol === "https:"
      && candidate.origin === storageOrigin
      && [
        "/storage/v1/object/public/message-attachments/",
        "/storage/v1/object/public/broadcast-attachments/",
      ].some((prefix) => candidate.pathname.startsWith(prefix));
  } catch {
    return false;
  }
}

async function attachmentData(url: string): Promise<{ base64: string; contentType: string } | null> {
  const head = await fetch(url, { method: "HEAD" }).catch(() => null);
  const size = Number(head?.headers.get("content-length") || 0);
  if (!head?.ok || size === 0 || size > MAX_MMS_SIZE) return null;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download attachment (${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    for (const byte of bytes.subarray(i, Math.min(i + 8192, bytes.length))) binary += String.fromCharCode(byte);
  }
  return { base64: btoa(binary), contentType: response.headers.get("content-type") || "application/octet-stream" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    const companyId = await resolveCompanyId(req, supabase, body.company_id);
    if (companyId instanceof Response) return companyId;

    const toPhone = typeof body.to_phone === "string" ? body.to_phone : "";
    const message = typeof body.message === "string" ? body.message : "";
    const attachmentUrl = body.attachment_url;
    if (!toPhone) return json({ error: "to_phone is required" }, 400);
    if (attachmentUrl && (typeof attachmentUrl !== "string" || !isAllowedAttachmentUrl(attachmentUrl, supabaseUrl))) {
      return json({ error: "Invalid attachment URL" }, 400);
    }

    const { data: connection, error } = await supabase
      .from("ringcentral_connections")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle();
    if (error || !connection) return json({ error: "RingCentral not connected" }, 409);

    const accessToken = await getValidToken(supabase, connection as Connection);
    const fromNumber = connection.phone_number || Deno.env.get("RINGCENTRAL_FROM_NUMBER");
    if (!fromNumber) return json({ error: "No from phone number configured" }, 400);

    let formattedPhone = toPhone.replace(/\D/g, "");
    if (formattedPhone.length === 10) formattedPhone = `+1${formattedPhone}`;
    else formattedPhone = `+${formattedPhone}`;

    let response: Response;
    let type = "SMS";
    if (attachmentUrl) {
      const attachment = await attachmentData(attachmentUrl);
      if (!attachment) {
        const fileName = decodeURIComponent(new URL(attachmentUrl).pathname.split("/").pop() || "Document");
        response = await fetch(`${RC_API_BASE}/account/~/extension/~/sms`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: { phoneNumber: fromNumber },
            to: [{ phoneNumber: formattedPhone }],
            text: message ? `${message}\n\n📎 ${fileName}: ${attachmentUrl}` : `📎 ${fileName}: ${attachmentUrl}`,
          }),
        });
        type = "SMS_WITH_LINK";
      } else {
        const boundary = `----RingCentralBoundary${crypto.randomUUID()}`;
        const multipart = [
          `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({
            from: { phoneNumber: fromNumber },
            to: [{ phoneNumber: formattedPhone }],
            text: message,
          })}\r\n`,
          `--${boundary}\r\nContent-Type: ${attachment.contentType}\r\nContent-Transfer-Encoding: base64\r\n\r\n${attachment.base64}\r\n`,
          `--${boundary}--\r\n`,
        ].join("");
        response = await fetch(`${RC_API_BASE}/account/~/extension/~/sms`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": `multipart/mixed; boundary=${boundary}` },
          body: multipart,
        });
        type = "MMS";
      }
    } else {
      response = await fetch(`${RC_API_BASE}/account/~/extension/~/sms`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: { phoneNumber: fromNumber }, to: [{ phoneNumber: formattedPhone }], text: message }),
      });
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Failed to send RingCentral message", response.status);
      return json({ error: "Failed to send message via RingCentral", provider_status: response.status }, 502);
    }

    return json({ success: true, message_id: payload.id, type });
  } catch (error) {
    console.error("Send message error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
