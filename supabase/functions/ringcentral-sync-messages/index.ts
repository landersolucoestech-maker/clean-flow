import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authorizeStaffRequest } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RC_API_BASE = "https://platform.ringcentral.com/restapi/v1.0";
const RC_TOKEN_URL = "https://platform.ringcentral.com/restapi/oauth/token";
const RC_CLIENT_ID = Deno.env.get("RINGCENTRAL_CLIENT_ID");
const RC_CLIENT_SECRET = Deno.env.get("RINGCENTRAL_CLIENT_SECRET");
type SupabaseClient = ReturnType<typeof createClient>;

interface RingCentralMessage {
  id: string;
  conversationId: string;
  creationTime: string;
  direction: "Inbound" | "Outbound";
  from: { phoneNumber?: string; name?: string };
  to: Array<{ phoneNumber?: string; name?: string }>;
  subject?: string;
  type: string;
  readStatus: string;
  messageStatus: string;
}

async function refreshToken(supabase: SupabaseClient, connection: {
  company_id: string;
  refresh_token: string;
}) {
  const response = await fetch(RC_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${RC_CLIENT_ID}:${RC_CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  const tokenData = await response.json();
  const tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  await supabase
    .from("ringcentral_connections")
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: tokenExpiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", connection.company_id);

  return tokenData.access_token;
}

async function getValidToken(supabase: SupabaseClient, connection: {
  company_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
}) {
  const expiresAt = new Date(connection.token_expires_at);
  const now = new Date();
  
  // Refresh if token expires in less than 5 minutes
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    return await refreshToken(supabase, connection);
  }
  
  return connection.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authError = await authorizeStaffRequest(
      req,
      supabase,
      ["admin", "office_manager", "virtual_assistant"],
      { allowServiceRole: true },
    );
    if (authError) return authError;

    const { company_id, days_back = 30 } = await req.json();

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: "company_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get RingCentral connection
    const { data: connection, error: connError } = await supabase
      .from("ringcentral_connections")
      .select("*")
      .eq("company_id", company_id)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "RingCentral not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get valid access token
    const accessToken = await getValidToken(supabase, connection);

    // Calculate date range
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days_back);

    // Fetch SMS messages from RingCentral
    const messagesUrl = new URL(`${RC_API_BASE}/account/~/extension/~/message-store`);
    messagesUrl.searchParams.set("messageType", "SMS");
    messagesUrl.searchParams.set("dateFrom", dateFrom.toISOString());
    messagesUrl.searchParams.set("perPage", "250");

    const messagesResponse = await fetch(messagesUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!messagesResponse.ok) {
      await messagesResponse.body?.cancel();
      console.error("Failed to fetch messages from RingCentral:", messagesResponse.status);
      return new Response(
        JSON.stringify({ error: "Failed to fetch messages from RingCentral" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messagesData = await messagesResponse.json();
    const rcMessages: RingCentralMessage[] = messagesData.records || [];

    // Get all customers with phone numbers
    const { data: customers } = await supabase
      .from("customers")
      .select("id, name, phone, phone2");

    // Get all staff with phone numbers
    const { data: staffMembers } = await supabase
      .from("staff")
      .select("id, name, phone");

    // Create phone to customer map (normalize phone numbers)
    const phoneToCustomer = new Map<string, { id: string; name: string }>();
    for (const customer of customers || []) {
      if (customer.phone) {
        const normalized = customer.phone.replace(/\D/g, "").slice(-10);
        phoneToCustomer.set(normalized, { id: customer.id, name: customer.name });
      }
      if (customer.phone2) {
        const normalized = customer.phone2.replace(/\D/g, "").slice(-10);
        phoneToCustomer.set(normalized, { id: customer.id, name: customer.name });
      }
    }

    // Create phone to staff map (normalize phone numbers)
    const phoneToStaff = new Map<string, { id: string; name: string }>();
    for (const staff of staffMembers || []) {
      if (staff.phone) {
        const normalized = staff.phone.replace(/\D/g, "").slice(-10);
        phoneToStaff.set(normalized, { id: staff.id, name: staff.name });
      }
    }

    // Group messages by conversation (phone number)
    const conversationMap = new Map<string, {
      customerId: string | null;
      staffId: string | null;
      recipientName: string | null;
      phoneNumber: string;
      messages: Array<{
        content: string;
        sender_type: string;
        created_at: string;
        rc_message_id: string;
      }>;
      lastMessageAt: string;
      lastMessage: string;
    }>();

    for (const msg of rcMessages) {
      const isInbound = msg.direction === "Inbound";
      const phoneNumber = isInbound 
        ? msg.from.phoneNumber 
        : msg.to[0]?.phoneNumber;

      if (!phoneNumber) continue;

      const normalizedPhone = phoneNumber.replace(/\D/g, "").slice(-10);
      const customer = phoneToCustomer.get(normalizedPhone);
      const staff = phoneToStaff.get(normalizedPhone);

      if (!conversationMap.has(normalizedPhone)) {
        conversationMap.set(normalizedPhone, {
          customerId: customer?.id || null,
          staffId: staff?.id || null,
          recipientName: customer?.name || staff?.name || null,
          phoneNumber,
          messages: [],
          lastMessageAt: msg.creationTime,
          lastMessage: msg.subject || "",
        });
      }

      const conv = conversationMap.get(normalizedPhone)!;
      conv.messages.push({
        content: msg.subject || "",
        sender_type: isInbound ? (conv.staffId ? "staff" : "customer") : "user",
        created_at: msg.creationTime,
        rc_message_id: msg.id,
      });

      // Update last message if this is more recent
      if (new Date(msg.creationTime) > new Date(conv.lastMessageAt)) {
        conv.lastMessageAt = msg.creationTime;
        conv.lastMessage = msg.subject || "";
      }
    }

    let syncedConversations = 0;
    let syncedMessages = 0;
    let skippedNoMatch = 0;

    // Process each conversation
    for (const [phone, convData] of conversationMap) {
      // Skip if no matching customer or staff
      if (!convData.customerId && !convData.staffId) {
        skippedNoMatch++;
        continue;
      }

      let conversationId: string;

      if (convData.customerId) {
        // Check if customer conversation exists
        const { data: existingConv } = await supabase
          .from("conversations")
          .select("id")
          .eq("customer_id", convData.customerId)
          .is("staff_id", null)
          .single();

        if (!existingConv) {
          // Create new customer conversation
          const { data: newConv, error: convError } = await supabase
            .from("conversations")
            .insert({
              customer_id: convData.customerId,
              last_message: convData.lastMessage,
              last_message_at: convData.lastMessageAt,
              unread: convData.messages.some(m => m.sender_type === "customer"),
            })
            .select("id")
            .single();

          if (convError) {
            console.error("Failed to create customer conversation:", convError);
            continue;
          }
          conversationId = newConv.id;
          syncedConversations++;
        } else {
          conversationId = existingConv.id;

          // Update last message
          await supabase
            .from("conversations")
            .update({
              last_message: convData.lastMessage,
              last_message_at: convData.lastMessageAt,
            })
            .eq("id", conversationId);
        }
      } else if (convData.staffId) {
        // Check if staff conversation exists
        const { data: existingConv } = await supabase
          .from("conversations")
          .select("id")
          .eq("staff_id", convData.staffId)
          .is("customer_id", null)
          .single();

        if (!existingConv) {
          // Create new staff conversation
          const { data: newConv, error: convError } = await supabase
            .from("conversations")
            .insert({
              staff_id: convData.staffId,
              last_message: convData.lastMessage,
              last_message_at: convData.lastMessageAt,
              unread: convData.messages.some(m => m.sender_type === "staff"),
            })
            .select("id")
            .single();

          if (convError) {
            console.error("Failed to create staff conversation:", convError);
            continue;
          }
          conversationId = newConv.id;
          syncedConversations++;
        } else {
          conversationId = existingConv.id;

          // Update last message
          await supabase
            .from("conversations")
            .update({
              last_message: convData.lastMessage,
              last_message_at: convData.lastMessageAt,
            })
            .eq("id", conversationId);
        }
      } else {
        continue;
      }

      // Insert messages (skip duplicates using the unique constraint)
      for (const msg of convData.messages) {
        try {
          const { error: msgError } = await supabase
            .from("messages")
            .upsert({
              conversation_id: conversationId,
              content: msg.content,
              sender_type: msg.sender_type,
              created_at: msg.created_at,
              read: msg.sender_type === "user",
              ringcentral_message_id: msg.rc_message_id,
            }, { onConflict: "ringcentral_message_id", ignoreDuplicates: true });

          if (msgError) {
            // Ignore duplicate key errors (23505)
            if (!msgError.code || msgError.code !== "23505") {
              console.error("Failed to insert message:", msgError);
            }
          } else {
            syncedMessages++;
          }
        } catch (e) {
          // Silently ignore duplicates
        }
      }
    }

    console.log(`Sync complete: ${syncedConversations} conversations, ${syncedMessages} messages, ${skippedNoMatch} skipped (no match)`);

    return new Response(
      JSON.stringify({
        success: true,
        synced_conversations: syncedConversations,
        synced_messages: syncedMessages,
        skipped_no_match: skippedNoMatch,
        total_rc_messages: rcMessages.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
