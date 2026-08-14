import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { authorizeServiceRequest } from "../_shared/authorize.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authError = authorizeServiceRequest(req);
    if (authError) return authError;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));
    const companyId = typeof body.company_id === "string" ? body.company_id : null;

    let settingsQuery = supabase.from("company_settings").select("id, trade_name, legal_name, google_review_url, nextdoor_review_url, review_delay_minutes");
    if (companyId) settingsQuery = settingsQuery.eq("id", companyId);
    const { data: companies, error: settingsError } = await settingsQuery;
    if (settingsError) throw settingsError;

    let processed = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const settings of companies || []) {
      const delayMinutes = settings.review_delay_minutes ?? 120;
      const cutoff = new Date(Date.now() - delayMinutes * 60_000).toISOString();
      const oldest = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const { data: jobs, error: jobsError } = await supabase.from("jobs")
        .select("id, customer_id, customers!inner(id, name, phone, company_id)")
        .eq("company_id", settings.id)
        .eq("status", "completed")
        .not("time_finished", "is", null)
        .lt("updated_at", cutoff)
        .gt("updated_at", oldest)
        .not("customers.phone", "is", null)
        .order("updated_at", { ascending: true })
        .limit(50);
      if (jobsError) { errors.push(`${settings.id}: ${jobsError.message}`); failed++; continue; }
      if (!jobs?.length) continue;

      const ids = jobs.map((job) => job.id);
      const { data: logs, error: logsError } = await supabase.from("review_request_logs").select("job_id").in("job_id", ids);
      if (logsError) { errors.push(`${settings.id}: ${logsError.message}`); failed++; continue; }
      const done = new Set((logs || []).map((log: { job_id: string }) => log.job_id));
      skipped += done.size;

      for (const job of jobs.filter((candidate) => !done.has(candidate.id))) {
        try {
          const relation = job.customers;
          const customer = Array.isArray(relation) ? relation[0] : relation;
          if (!customer?.phone || customer.company_id !== settings.id) { skipped++; continue; }
          const companyName = settings.trade_name || settings.legal_name || "Our Company";
          const links = [
            settings.google_review_url ? `🌟Google Review: ${settings.google_review_url}` : "",
            settings.nextdoor_review_url ? `🌟Nextdoor Review: ${settings.nextdoor_review_url}` : "",
          ].filter(Boolean).join("\n\n") || "It really helps our small business. Thank you!";
          const message = `Hi ${customer.name}! Thank you for choosing ${companyName}. We'd love to hear your feedback! Could you take a moment to leave us a review?\n\n${links}\n\n- ${companyName}`;

          const { data: existing, error: lookupError } = await supabase.from("conversations").select("id")
            .eq("company_id", settings.id).eq("customer_id", customer.id).is("staff_id", null).maybeSingle();
          if (lookupError) throw lookupError;
          let conversationId = existing?.id;
          if (!conversationId) {
            const created = await supabase.from("conversations").insert({ company_id: settings.id, customer_id: customer.id }).select("id").single();
            if (created.error || !created.data) throw created.error || new Error("Failed to create conversation");
            conversationId = created.data.id;
          }

          const messageInsert = await supabase.from("messages").insert({
            conversation_id: conversationId,
            content: message,
            sender_type: "user",
            read: true,
            delivery_status: "pending",
            delivery_attempts: 1,
            last_delivery_attempt_at: new Date().toISOString(),
          }).select("id").single();
          if (messageInsert.error || !messageInsert.data) throw messageInsert.error || new Error("Failed to create outbound message");

          const send = await fetch(`${supabaseUrl}/functions/v1/send-sms-message`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
            body: JSON.stringify({ company_id: settings.id, to_phone: customer.phone, message }),
          });
          const sendPayload = await send.json().catch(() => ({}));
          const provider = sendPayload?.provider === "dialpad" ? "dialpad" : sendPayload?.provider === "ringcentral" ? "ringcentral" : null;
          const providerMessageId = sendPayload?.message_id != null ? String(sendPayload.message_id) : null;
          const smsSent = send.ok && sendPayload?.success === true && provider !== null;

          const deliveryUpdate: Record<string, unknown> = smsSent
            ? {
                delivery_status: "sent",
                delivery_error: null,
                provider,
                provider_message_id: providerMessageId,
              }
            : {
                delivery_status: "failed",
                delivery_error: typeof sendPayload?.error === "string" ? sendPayload.error.slice(0, 500) : `SMS gateway HTTP ${send.status}`,
              };
          if (provider === "ringcentral" && providerMessageId) deliveryUpdate.ringcentral_message_id = providerMessageId;
          await supabase.from("messages").update(deliveryUpdate).eq("id", messageInsert.data.id);

          if (smsSent) {
            const conversationUpdate = await supabase.from("conversations").update({
              last_message: message.length > 100 ? `${message.slice(0, 100)}...` : message,
              last_message_at: new Date().toISOString(), unread: false,
            }).eq("id", conversationId).eq("company_id", settings.id);
            if (conversationUpdate.error) console.warn("Review SMS sent but conversation preview update failed", conversationUpdate.error);
          }

          const log = await supabase.from("review_request_logs").insert({ job_id: job.id, customer_id: customer.id, message, sms_sent: smsSent });
          if (log.error) throw log.error;
          if (smsSent) processed++; else { failed++; errors.push(`${settings.id}/${job.id}: ${typeof sendPayload?.error === "string" ? sendPayload.error : "SMS delivery failed"}`); }
        } catch (error) {
          failed++;
          errors.push(`${settings.id}/${job.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    return json({ success: true, processed, failed, skipped, errors: errors.length ? errors : undefined });
  } catch (error) {
    console.error("Review automation error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
