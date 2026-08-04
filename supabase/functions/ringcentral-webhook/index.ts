import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// RingCentral sends webhook validation requests
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const expectedToken = Deno.env.get("RINGCENTRAL_WEBHOOK_VERIFICATION_TOKEN");
    if (!expectedToken) {
      return new Response(JSON.stringify({ error: "Webhook verification is not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validationToken = req.headers.get("Validation-Token");
    const verificationToken = req.headers.get("Verification-Token");
    const receivedToken = verificationToken || validationToken;
    if (receivedToken !== expectedToken) {
      return new Response(JSON.stringify({ error: "Invalid webhook verification token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Subscription creation has no payload and requires the validation token echoed back.
    if (validationToken && (req.headers.get("Content-Length") === "0" || !req.body)) {
      return new Response(null, {
        status: 200,
        headers: { ...corsHeaders, "Validation-Token": validationToken },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();

    // Handle SMS notification
    if (body.event && body.event.includes("/message-store")) {
      const message = body.body;
      
      if (!message || message.type !== "SMS") {
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isInbound = message.direction === "Inbound";
      const phoneNumber = isInbound 
        ? message.from?.phoneNumber 
        : message.to?.[0]?.phoneNumber;

      if (!phoneNumber) {
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const normalizedPhone = phoneNumber.replace(/\D/g, "").slice(-10);

      // Find customer by phone number
      const { data: customers } = await supabase
        .from("customers")
        .select("id, name, phone, phone2")
        .or(`phone.ilike.%${normalizedPhone}%,phone2.ilike.%${normalizedPhone}%`);

      const customer = customers?.[0];

      if (!customer) {
        return new Response(JSON.stringify({ received: true, no_customer: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find or create conversation
      let { data: conversation } = await supabase
        .from("conversations")
        .select("id")
        .eq("customer_id", customer.id)
        .single();

      if (!conversation) {
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({
            customer_id: customer.id,
            last_message: message.subject || "",
            last_message_at: message.creationTime || new Date().toISOString(),
            unread: isInbound,
          })
          .select("id")
          .single();

        if (convError) {
          console.error("Failed to create conversation:", convError);
          return new Response(JSON.stringify({ error: "Failed to create conversation" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        conversation = newConv;
      }

      // Insert message
      const { error: msgError } = await supabase
        .from("messages")
        .upsert({
          conversation_id: conversation.id,
          content: message.subject || "",
          sender_type: isInbound ? "customer" : "user",
          created_at: message.creationTime || new Date().toISOString(),
          read: !isInbound,
          ringcentral_message_id: message.id ? String(message.id) : null,
        }, { onConflict: "ringcentral_message_id", ignoreDuplicates: true });

      if (msgError) {
        console.error("Failed to insert message:", msgError);
      }

      // Update conversation
      await supabase
        .from("conversations")
        .update({
          last_message: message.subject || "",
          last_message_at: message.creationTime || new Date().toISOString(),
          unread: isInbound,
        })
        .eq("id", conversation.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Webhook processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
