import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { getAuthorizedStaffIdentity } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CustomerContact = { phone: string | null; phone2: string | null };
type StaffContact = { phone: string | null };
type SmsProvider = "ringcentral" | "dialpad";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function firstRelated<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const authorization = await getAuthorizedStaffIdentity(
      req,
      admin,
      ["admin", "cleaning_manager", "office_manager", "virtual_assistant"],
    );
    if (authorization.error) return authorization.error;
    const companyId = authorization.identity.companyId;

    const body = await req.json();
    const conversationId = typeof body.conversation_id === "string" ? body.conversation_id : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const attachmentUrl = typeof body.attachment_url === "string" && body.attachment_url ? body.attachment_url : null;
    if (!conversationId || (!content && !attachmentUrl)) return json({ error: "conversation_id and content or attachment are required" }, 400);
    if (attachmentUrl && !isAllowedAttachmentUrl(attachmentUrl, supabaseUrl)) return json({ error: "Invalid attachment URL" }, 400);

    const { data: conversation, error: conversationError } = await admin
      .from("conversations")
      .select(`
        id, company_id, customer_id, staff_id,
        customer:customers(id, phone, phone2),
        staff:staff(id, phone)
      `)
      .eq("id", conversationId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (conversationError || !conversation) return json({ error: "Conversation not found" }, 404);

    const customer = firstRelated(conversation.customer as CustomerContact | CustomerContact[] | null);
    const staff = firstRelated(conversation.staff as StaffContact | StaffContact[] | null);
    const phone = customer?.phone || customer?.phone2 || staff?.phone || null;
    if (!phone) return json({ error: "Recipient has no phone number" }, 409);

    const { data: message, error: insertError } = await admin
      .from("messages")
      .insert({
        conversation_id: conversationId,
        content: content || "📎 Attachment",
        sender_type: "user",
        attachment_url: attachmentUrl,
        read: true,
        delivery_status: "pending",
        delivery_attempts: 1,
        last_delivery_attempt_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (insertError || !message) throw insertError || new Error("Unable to persist outbound message");

    const providerResponse = await fetch(`${supabaseUrl}/functions/v1/send-sms-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        company_id: companyId,
        to_phone: phone,
        message: content,
        attachment_url: attachmentUrl,
      }),
    });
    const providerPayload = await providerResponse.json().catch(() => ({}));
    const provider = providerPayload.provider === "dialpad" ? "dialpad" : providerPayload.provider === "ringcentral" ? "ringcentral" : null;

    if (!providerResponse.ok || !provider) {
      const deliveryError = typeof providerPayload.error === "string"
        ? providerPayload.error
        : `SMS gateway HTTP ${providerResponse.status}`;
      await admin
        .from("messages")
        .update({ delivery_status: "failed", delivery_error: deliveryError.slice(0, 500) })
        .eq("id", message.id);
      return json({ error: deliveryError, message_id: message.id, delivery_status: "failed", provider }, 502);
    }

    const typedProvider = provider as SmsProvider;
    const providerId = providerPayload.message_id != null ? String(providerPayload.message_id) : null;
    const deliveryUpdate: Record<string, unknown> = {
      delivery_status: "sent",
      delivery_error: null,
      provider: typedProvider,
      provider_message_id: providerId,
    };
    if (typedProvider === "ringcentral") deliveryUpdate.ringcentral_message_id = providerId;

    const { error: sentError } = await admin
      .from("messages")
      .update(deliveryUpdate)
      .eq("id", message.id);
    if (sentError) {
      console.error("Message delivered but local delivery state update failed", sentError);
      return json({
        success: true,
        message: { ...message, delivery_status: "pending", provider: typedProvider },
        provider_message_id: providerId,
        provider: typedProvider,
        warning: "Delivered but local delivery status requires reconciliation",
      }, 202);
    }

    const lastMessage = content || "📎 Attachment";
    const { error: conversationUpdateError } = await admin
      .from("conversations")
      .update({
        last_message: lastMessage,
        last_message_at: new Date().toISOString(),
        unread: false,
      })
      .eq("id", conversationId)
      .eq("company_id", companyId);
    if (conversationUpdateError) console.error("Message sent but conversation preview update failed", conversationUpdateError);

    return json({
      success: true,
      message: { ...message, delivery_status: "sent", provider: typedProvider, provider_message_id: providerId },
      provider_message_id: providerId,
      provider: typedProvider,
    });
  } catch (error) {
    console.error("Conversation message delivery error:", error);
    return json({ error: error instanceof Error ? error.message : "Message delivery failed" }, 500);
  }
});
