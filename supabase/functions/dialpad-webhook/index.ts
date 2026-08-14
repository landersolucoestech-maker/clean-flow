import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64UrlBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

function bytesToBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy.buffer;
}

async function verifyJwt(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const [headerPart, payloadPart, signaturePart, extra] = token.split(".");
    if (!headerPart || !payloadPart || !signaturePart || extra) return null;
    const header = JSON.parse(new TextDecoder().decode(base64UrlBytes(headerPart)));
    if (header.alg !== "HS256") return null;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      bytesToBuffer(base64UrlBytes(signaturePart)),
      new TextEncoder().encode(`${headerPart}.${payloadPart}`),
    );
    if (!valid) return null;
    return JSON.parse(new TextDecoder().decode(base64UrlBytes(payloadPart))) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizePhone(value: unknown): string {
  return typeof value === "string" ? value.replace(/\D/g, "").slice(-10) : "";
}

function firstPhone(value: unknown): string {
  if (Array.isArray(value)) return value.find((item) => typeof item === "string") as string || "";
  return typeof value === "string" ? value : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Backend not configured" }, 503);
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const connectionId = new URL(req.url).searchParams.get("connection");
    if (!connectionId) return json({ error: "Missing connection" }, 400);

    const { data: connection, error: connectionError } = await admin
      .from("dialpad_connections")
      .select("id, company_id, phone_number, webhook_secret")
      .eq("id", connectionId)
      .maybeSingle();
    if (connectionError || !connection?.webhook_secret) return json({ error: "Unknown webhook connection" }, 404);

    const raw = (await req.text()).trim();
    const token = raw.startsWith("{")
      ? (() => {
          try {
            const parsed = JSON.parse(raw);
            return typeof parsed.jwt === "string" ? parsed.jwt : typeof parsed.token === "string" ? parsed.token : "";
          } catch { return ""; }
        })()
      : raw.replace(/^"|"$/g, "");
    const payload = await verifyJwt(token, connection.webhook_secret);
    if (!payload) return json({ error: "Invalid Dialpad webhook signature" }, 401);

    const direction = String(payload.direction || "").toLowerCase();
    const inbound = direction === "inbound";
    const providerMessageId = payload.id != null
      ? String(payload.id)
      : payload.message_id != null ? String(payload.message_id) : null;
    const deliveryStatus = typeof payload.message_status === "string" ? payload.message_status : null;

    if (providerMessageId && deliveryStatus && !inbound) {
      await admin
        .from("messages")
        .update({ delivery_status: deliveryStatus, delivery_error: payload.message_delivery_result || null })
        .eq("provider", "dialpad")
        .eq("provider_message_id", providerMessageId);
    }

    const externalPhone = inbound ? payload.from_number : firstPhone(payload.to_number ?? payload.to_numbers);
    const normalizedExternal = normalizePhone(externalPhone);
    if (!inbound || !normalizedExternal) return json({ received: true, delivery_updated: Boolean(providerMessageId && deliveryStatus) });

    const companyId = connection.company_id as string;
    const { data: candidates, error: customerError } = await admin
      .from("customers")
      .select("id, phone, phone2")
      .eq("company_id", companyId);
    if (customerError) return json({ error: "Unable to resolve message customer" }, 500);
    const customers = (candidates || []).filter(
      (customer) => normalizePhone(customer.phone) === normalizedExternal || normalizePhone(customer.phone2) === normalizedExternal,
    );
    if (customers.length !== 1) return json({ received: true, no_unique_customer: true });
    const customer = customers[0];

    const { data: existingConversation, error: lookupError } = await admin
      .from("conversations")
      .select("id")
      .eq("company_id", companyId)
      .eq("customer_id", customer.id)
      .is("staff_id", null)
      .maybeSingle();
    if (lookupError) return json({ error: "Unable to resolve conversation" }, 500);

    const content = typeof payload.text === "string" ? payload.text : "";
    const createdAt = typeof payload.date_started === "string"
      ? payload.date_started
      : typeof payload.created_at === "string" ? payload.created_at : new Date().toISOString();

    let conversationId = existingConversation?.id as string | undefined;
    if (!conversationId) {
      const { data: created, error } = await admin
        .from("conversations")
        .insert({
          company_id: companyId,
          customer_id: customer.id,
          last_message: content,
          last_message_at: createdAt,
          unread: true,
        })
        .select("id")
        .single();
      if (error || !created) return json({ error: "Failed to create conversation" }, 500);
      conversationId = created.id;
    }

    if (providerMessageId) {
      const { data: duplicate } = await admin
        .from("messages")
        .select("id")
        .eq("provider", "dialpad")
        .eq("provider_message_id", providerMessageId)
        .maybeSingle();
      if (duplicate) return json({ success: true, duplicate: true });
    }

    const { error: messageError } = await admin.from("messages").insert({
      conversation_id: conversationId,
      content,
      sender_type: "customer",
      created_at: createdAt,
      read: false,
      provider: "dialpad",
      provider_message_id: providerMessageId,
      delivery_status: deliveryStatus || "received",
    });
    if (messageError) return json({ error: "Failed to persist message" }, 500);

    const { error: conversationError } = await admin
      .from("conversations")
      .update({ last_message: content, last_message_at: createdAt, unread: true })
      .eq("id", conversationId)
      .eq("company_id", companyId);
    if (conversationError) return json({ error: "Failed to update conversation" }, 500);

    return json({ success: true });
  } catch (error) {
    console.error("Dialpad webhook error:", error);
    return json({ error: "Webhook processing failed" }, 500);
  }
});
