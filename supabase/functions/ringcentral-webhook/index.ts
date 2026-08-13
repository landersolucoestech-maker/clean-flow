import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, validation-token, verification-token",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(value: unknown): string {
  return typeof value === "string" ? value.replace(/\D/g, "").slice(-10) : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const expectedToken = Deno.env.get("RINGCENTRAL_WEBHOOK_VERIFICATION_TOKEN");
    if (!expectedToken) return json({ error: "Webhook verification is not configured" }, 503);

    const validationToken = req.headers.get("Validation-Token");
    const verificationToken = req.headers.get("Verification-Token");
    if ((verificationToken || validationToken) !== expectedToken) {
      return json({ error: "Invalid webhook verification token" }, 401);
    }

    if (validationToken && (req.headers.get("Content-Length") === "0" || !req.body)) {
      return new Response(null, {
        status: 200,
        headers: { ...corsHeaders, "Validation-Token": validationToken },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Backend not configured" }, 503);
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload = await req.json();
    if (!payload.event?.includes("/message-store") || payload.body?.type !== "SMS") {
      return json({ received: true });
    }

    const message = payload.body;
    const inbound = message.direction === "Inbound";
    const externalPhone = inbound ? message.from?.phoneNumber : message.to?.[0]?.phoneNumber;
    const companyPhone = inbound ? message.to?.[0]?.phoneNumber : message.from?.phoneNumber;
    const normalizedExternal = normalizePhone(externalPhone);
    const normalizedCompany = normalizePhone(companyPhone);
    if (!normalizedExternal || !normalizedCompany) return json({ received: true, unmatched_phone: true });

    const { data: connections, error: connectionError } = await supabase
      .from("ringcentral_connections")
      .select("company_id, phone_number");
    if (connectionError) return json({ error: "Unable to resolve webhook tenant" }, 500);

    const matchingConnections = (connections || []).filter(
      (connection) => normalizePhone(connection.phone_number) === normalizedCompany,
    );
    if (matchingConnections.length !== 1) {
      console.warn("RingCentral webhook tenant could not be resolved uniquely", {
        matches: matchingConnections.length,
        provider_message_id: message.id || null,
      });
      return json({ received: true, tenant_unresolved: true });
    }
    const companyId = matchingConnections[0].company_id as string;

    const { data: candidates, error: customerError } = await supabase
      .from("customers")
      .select("id, name, phone, phone2")
      .eq("company_id", companyId);
    if (customerError) return json({ error: "Unable to resolve message customer" }, 500);
    const customers = (candidates || []).filter(
      (customer) => normalizePhone(customer.phone) === normalizedExternal || normalizePhone(customer.phone2) === normalizedExternal,
    );
    if (customers.length !== 1) {
      return json({ received: true, no_unique_customer: true });
    }
    const customer = customers[0];

    const { data: existingConversation, error: lookupError } = await supabase
      .from("conversations")
      .select("id")
      .eq("company_id", companyId)
      .eq("customer_id", customer.id)
      .is("staff_id", null)
      .maybeSingle();
    if (lookupError) return json({ error: "Unable to resolve conversation" }, 500);

    let conversationId = existingConversation?.id as string | undefined;
    if (!conversationId) {
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({
          company_id: companyId,
          customer_id: customer.id,
          last_message: message.subject || "",
          last_message_at: message.creationTime || new Date().toISOString(),
          unread: inbound,
        })
        .select("id")
        .single();
      if (error || !created) return json({ error: "Failed to create conversation" }, 500);
      conversationId = created.id;
    }

    const { error: messageError } = await supabase.from("messages").upsert({
      conversation_id: conversationId,
      content: message.subject || "",
      sender_type: inbound ? "customer" : "user",
      created_at: message.creationTime || new Date().toISOString(),
      read: !inbound,
      ringcentral_message_id: message.id ? String(message.id) : null,
    }, { onConflict: "ringcentral_message_id", ignoreDuplicates: true });
    if (messageError) return json({ error: "Failed to persist message" }, 500);

    const { error: conversationError } = await supabase
      .from("conversations")
      .update({
        last_message: message.subject || "",
        last_message_at: message.creationTime || new Date().toISOString(),
        unread: inbound,
      })
      .eq("id", conversationId)
      .eq("company_id", companyId);
    if (conversationError) return json({ error: "Failed to update conversation" }, 500);

    return json({ success: true });
  } catch (error) {
    console.error("RingCentral webhook error:", error);
    return json({ error: "Webhook processing failed" }, 500);
  }
});
