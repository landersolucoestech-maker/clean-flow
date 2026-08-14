import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { getAuthorizedStaffIdentity } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const API_BASE = "https://dialpad.com/api/v2";
const TOKEN_URL = "https://dialpad.com/oauth2/token";
const CLIENT_ID = Deno.env.get("DIALPAD_CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("DIALPAD_CLIENT_SECRET");
const MAX_MMS_SIZE = 500 * 1024;

type Connection = {
  company_id: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string;
  phone_number: string | null;
  dialpad_user_id: string | null;
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

function expiryIso(expiresIn: unknown): string {
  const value = Number(expiresIn);
  const milliseconds = Number.isFinite(value) && value > 0
    ? (value > 10_000_000 ? value * 1000 : Date.now() + value * 1000)
    : Date.now() + 60 * 60 * 1000;
  return new Date(milliseconds).toISOString();
}

async function getValidToken(supabase: SupabaseClient, connection: Connection): Promise<string> {
  if (new Date(connection.token_expires_at).getTime() > Date.now() + 5 * 60_000) return connection.access_token;
  if (!CLIENT_ID || !CLIENT_SECRET || !connection.refresh_token) throw new Error("Dialpad refresh credentials are not available");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.access_token !== "string") throw new Error("Failed to refresh Dialpad token");

  const { error } = await supabase
    .from("dialpad_connections")
    .update({
      access_token: payload.access_token,
      refresh_token: typeof payload.refresh_token === "string" ? payload.refresh_token : connection.refresh_token,
      token_expires_at: expiryIso(payload.expires_in),
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", connection.company_id);
  if (error) throw new Error("Failed to persist refreshed Dialpad token");
  return payload.access_token;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  return phone.startsWith("+") ? `+${digits}` : `+${digits}`;
}

function isAllowedAttachmentUrl(value: string, supabaseUrl: string): boolean {
  try {
    const candidate = new URL(value);
    return candidate.protocol === "https:"
      && candidate.origin === new URL(supabaseUrl).origin
      && [
        "/storage/v1/object/public/message-attachments/",
        "/storage/v1/object/public/broadcast-attachments/",
      ].some((prefix) => candidate.pathname.startsWith(prefix));
  } catch {
    return false;
  }
}

async function attachmentBase64(url: string): Promise<string | null> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download attachment (${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_MMS_SIZE) return null;
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    for (const byte of bytes.subarray(i, Math.min(i + 8192, bytes.length))) binary += String.fromCharCode(byte);
  }
  return btoa(binary);
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
    const attachmentUrl = typeof body.attachment_url === "string" && body.attachment_url ? body.attachment_url : null;
    if (!toPhone) return json({ error: "to_phone is required" }, 400);
    if (!message && !attachmentUrl) return json({ error: "message or attachment_url is required" }, 400);
    if (attachmentUrl && !isAllowedAttachmentUrl(attachmentUrl, supabaseUrl)) return json({ error: "Invalid attachment URL" }, 400);

    const { data: connection, error } = await supabase
      .from("dialpad_connections")
      .select("company_id, access_token, refresh_token, token_expires_at, phone_number, dialpad_user_id")
      .eq("company_id", companyId)
      .maybeSingle();
    if (error || !connection) return json({ error: "Dialpad not connected" }, 409);

    const accessToken = await getValidToken(supabase, connection as Connection);
    const payload: Record<string, unknown> = {
      to_numbers: [normalizePhone(toPhone)],
      text: message,
    };
    if (connection.phone_number) payload.from_number = connection.phone_number;
    else if (connection.dialpad_user_id && /^\d+$/.test(connection.dialpad_user_id)) payload.user_id = Number(connection.dialpad_user_id);

    if (attachmentUrl) {
      const media = await attachmentBase64(attachmentUrl);
      if (media) payload.media = media;
      else {
        const fileName = decodeURIComponent(new URL(attachmentUrl).pathname.split("/").pop() || "Attachment");
        payload.text = message ? `${message}\n\n📎 ${fileName}: ${attachmentUrl}` : `📎 ${fileName}: ${attachmentUrl}`;
      }
    }

    const response = await fetch(`${API_BASE}/sms`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const providerPayload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Failed to send Dialpad message", response.status);
      return json({ error: "Failed to send message via Dialpad", provider_status: response.status }, 502);
    }

    const messageId = providerPayload.id != null
      ? String(providerPayload.id)
      : providerPayload.message_id != null ? String(providerPayload.message_id) : null;
    return json({ success: true, message_id: messageId, type: attachmentUrl ? "MMS" : "SMS" });
  } catch (error) {
    console.error("Dialpad send message error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
