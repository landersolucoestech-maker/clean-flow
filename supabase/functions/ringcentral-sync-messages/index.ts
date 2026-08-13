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

type RingCentralTokenResponse = { access_token: string; refresh_token: string; expires_in: number };
type RingCentralMessage = {
  id: string;
  creationTime: string;
  direction: "Inbound" | "Outbound";
  from: { phoneNumber?: string };
  to: Array<{ phoneNumber?: string }>;
  subject?: string;
};
type Connection = { company_id: string; access_token: string; refresh_token: string; token_expires_at: string };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

async function resolveCompanyId(req: Request, supabase: SupabaseClient, requested: unknown): Promise<string | Response> {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (serviceRoleKey && token === serviceRoleKey) {
    return typeof requested === "string" && requested ? requested : json({ error: "company_id is required" }, 400);
  }
  const authorization = await getAuthorizedStaffIdentity(req, supabase, ["admin", "office_manager", "virtual_assistant"]);
  if (authorization.error) return authorization.error;
  if (requested && requested !== authorization.identity.companyId) return json({ error: "Cross-company synchronization is not allowed" }, 403);
  return authorization.identity.companyId;
}

async function refreshToken(supabase: SupabaseClient, connection: Connection): Promise<string> {
  if (!RC_CLIENT_ID || !RC_CLIENT_SECRET) throw new Error("RingCentral credentials are not configured");
  const response = await fetch(RC_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${btoa(`${RC_CLIENT_ID}:${RC_CLIENT_SECRET}`)}` },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: connection.refresh_token }),
  });
  const tokenData = await response.json() as RingCentralTokenResponse;
  if (!response.ok || !tokenData.access_token) throw new Error("Failed to refresh RingCentral token");
  const { error } = await supabase.from("ringcentral_connections").update({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || connection.refresh_token,
    token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("company_id", connection.company_id);
  if (error) throw new Error("Failed to persist refreshed RingCentral token");
  return tokenData.access_token;
}

async function getValidToken(supabase: SupabaseClient, connection: Connection): Promise<string> {
  return new Date(connection.token_expires_at).getTime() - Date.now() < 5 * 60_000 ? refreshToken(supabase, connection) : connection.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Backend not configured" }, 503);
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    const companyId = await resolveCompanyId(req, supabase, body.company_id);
    if (companyId instanceof Response) return companyId;
    const daysBack = Math.min(90, Math.max(1, Number(body.days_back) || 30));

    const { data: connection, error: connectionError } = await supabase.from("ringcentral_connections")
      .select("company_id, access_token, refresh_token, token_expires_at").eq("company_id", companyId).maybeSingle();
    if (connectionError || !connection) return json({ error: "RingCentral not connected" }, 409);
    const accessToken = await getValidToken(supabase, connection as Connection);

    const messagesUrl = new URL(`${RC_API_BASE}/account/~/extension/~/message-store`);
    messagesUrl.searchParams.set("messageType", "SMS");
    messagesUrl.searchParams.set("dateFrom", new Date(Date.now() - daysBack * 86_400_000).toISOString());
    messagesUrl.searchParams.set("perPage", "250");
    const messagesResponse = await fetch(messagesUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!messagesResponse.ok) {
      await messagesResponse.body?.cancel();
      return json({ error: "Failed to fetch messages from RingCentral", provider_status: messagesResponse.status }, 502);
    }
    const rcMessages = ((await messagesResponse.json()).records || []) as RingCentralMessage[];

    const [{ data: customers }, { data: staffMembers }] = await Promise.all([
      supabase.from("customers").select("id, name, phone, phone2").eq("company_id", companyId),
      supabase.from("staff").select("id, name, phone").eq("company_id", companyId),
    ]);
    const phoneToCustomer = new Map<string, { id: string; name: string }>();
    for (const customer of customers || []) {
      if (customer.phone) phoneToCustomer.set(normalizePhone(customer.phone), { id: customer.id, name: customer.name });
      if (customer.phone2) phoneToCustomer.set(normalizePhone(customer.phone2), { id: customer.id, name: customer.name });
    }
    const phoneToStaff = new Map<string, { id: string; name: string }>();
    for (const staff of staffMembers || []) if (staff.phone) phoneToStaff.set(normalizePhone(staff.phone), { id: staff.id, name: staff.name });

    const conversations = new Map<string, {
      customerId: string | null;
      staffId: string | null;
      messages: Array<{ content: string; senderType: string; createdAt: string; providerId: string }>;
      lastAt: string;
      lastMessage: string;
    }>();
    let skippedNoMatch = 0;

    for (const message of rcMessages) {
      const inbound = message.direction === "Inbound";
      const phone = inbound ? message.from.phoneNumber : message.to[0]?.phoneNumber;
      if (!phone) { skippedNoMatch++; continue; }
      const normalized = normalizePhone(phone);
      const customer = phoneToCustomer.get(normalized);
      const staff = phoneToStaff.get(normalized);
      if (!customer && !staff) { skippedNoMatch++; continue; }
      const current = conversations.get(normalized) || {
        customerId: customer?.id || null,
        staffId: staff?.id || null,
        messages: [],
        lastAt: message.creationTime,
        lastMessage: message.subject || "",
      };
      current.messages.push({ content: message.subject || "", senderType: inbound ? (staff ? "staff" : "customer") : "user", createdAt: message.creationTime, providerId: message.id });
      if (new Date(message.creationTime) > new Date(current.lastAt)) {
        current.lastAt = message.creationTime;
        current.lastMessage = message.subject || "";
      }
      conversations.set(normalized, current);
    }

    let syncedConversations = 0;
    let syncedMessages = 0;
    for (const conversation of conversations.values()) {
      let lookup = supabase.from("conversations").select("id").eq("company_id", companyId);
      lookup = conversation.customerId
        ? lookup.eq("customer_id", conversation.customerId).is("staff_id", null)
        : lookup.eq("staff_id", conversation.staffId).is("customer_id", null);
      const { data: existing } = await lookup.maybeSingle();
      let conversationId = existing?.id as string | undefined;
      if (!conversationId) {
        const { data: created, error } = await supabase.from("conversations").insert({
          company_id: companyId,
          customer_id: conversation.customerId,
          staff_id: conversation.staffId,
          last_message: conversation.lastMessage,
          last_message_at: conversation.lastAt,
          unread: conversation.messages.some((message) => message.senderType !== "user"),
        }).select("id").single();
        if (error || !created) continue;
        conversationId = created.id;
        syncedConversations++;
      } else {
        await supabase.from("conversations").update({ last_message: conversation.lastMessage, last_message_at: conversation.lastAt })
          .eq("id", conversationId).eq("company_id", companyId);
      }
      for (const message of conversation.messages) {
        const { error } = await supabase.from("messages").upsert({
          conversation_id: conversationId,
          content: message.content,
          sender_type: message.senderType,
          created_at: message.createdAt,
          read: message.senderType === "user",
          ringcentral_message_id: message.providerId,
        }, { onConflict: "ringcentral_message_id", ignoreDuplicates: true });
        if (!error) syncedMessages++;
      }
    }

    return json({ success: true, company_id: companyId, synced_conversations: syncedConversations, synced_messages: syncedMessages, skipped_no_match: skippedNoMatch, total_rc_messages: rcMessages.length });
  } catch (error) {
    console.error("RingCentral sync error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
