import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { authorizeServiceRequest } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AutomationCustomer = {
  id: string;
  name: string | null;
  phone: string | null;
  phone2: string | null;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function replaceVariables(message: string, data: Record<string, string>): string {
  return Object.entries(data).reduce(
    (value, [key, replacement]) => value.replace(new RegExp(`\\{${key}\\}`, "gi"), replacement),
    message,
  );
}

function formatJobDate(date: string): string {
  try {
    return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "America/New_York",
    });
  } catch {
    return date;
  }
}

function getNYMinutes(): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const part = (type: string) => Number(parts.find((entry) => entry.type === type)?.value || 0);
  return part("hour") * 60 + part("minute");
}

function isTimeToSend(sendAtTime: string | null): boolean {
  if (!sendAtTime) return true;
  const [hour, minute = 0] = sendAtTime.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false;
  return Math.abs(getNYMinutes() - (hour * 60 + minute)) <= 30;
}

function targetDate(delayType: string, delayValue: number, direction: "before" | "after"): Date {
  const unit = delayType === "hours" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const offset = Math.max(0, Number(delayValue) || 0) * unit;
  return new Date(Date.now() + (direction === "before" ? offset : -offset));
}

function customerFrom(value: AutomationCustomer | AutomationCustomer[] | null): AutomationCustomer | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function recipient(customer: AutomationCustomer, messageTo: string | null): string | null {
  return messageTo === "text_phone_2" ? customer.phone2 : customer.phone;
}

async function sendSms(
  supabaseUrl: string,
  serviceRoleKey: string,
  companyId: string,
  phone: string,
  message: string,
): Promise<boolean> {
  const response = await fetch(`${supabaseUrl}/functions/v1/ringcentral-send-message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ company_id: companyId, to_phone: phone, message }),
  });
  await response.body?.cancel();
  return response.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authError = authorizeServiceRequest(req);
    if (authError) return authError;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Backend not configured" }, 503);

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: automations, error: automationsError } = await supabase
      .from("automation_configs")
      .select("*")
      .in("trigger_type", ["time_before", "time_after"])
      .eq("enabled", true)
      .not("company_id", "is", null);

    if (automationsError) return json({ error: "Failed to fetch automations" }, 500);

    const results = { processed: 0, sent: 0, skipped: 0, errors: [] as string[] };
    const settingsCache = new Map<string, string>();

    for (const automation of automations || []) {
      results.processed++;
      const companyId = automation.company_id as string | null;
      if (!companyId || !isTimeToSend(automation.send_at_time)) {
        results.skipped++;
        continue;
      }

      let companyName: string = settingsCache.get(companyId) || "";
      if (!companyName) {
        const { data: settings } = await supabase
          .from("company_settings")
          .select("trade_name, legal_name")
          .eq("id", companyId)
          .maybeSingle();
        companyName = settings?.trade_name || settings?.legal_name || "Our Team";
        settingsCache.set(companyId, companyName);
      }

      const delayType = automation.delay_type || "days";
      const delayValue = automation.delay_value || 0;
      const sentSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      if (automation.trigger_type === "time_before") {
        const date = targetDate(delayType, delayValue, "before");
        const scheduledDate = date.toISOString().slice(0, 10);
        const { data: jobs, error } = await supabase
          .from("jobs")
          .select("id, scheduled_date, customer_id, customer:customers(id, name, phone, phone2, company_id)")
          .eq("company_id", companyId)
          .eq("scheduled_date", scheduledDate)
          .in("status", ["scheduled", "pending"]);

        if (error) {
          results.errors.push(`Failed to fetch jobs for ${automation.id}`);
          continue;
        }

        for (const job of jobs || []) {
          const customer = customerFrom(job.customer as AutomationCustomer | AutomationCustomer[] | null);
          if (!customer) continue;
          const phone = recipient(customer, automation.message_to);
          if (!phone) {
            results.skipped++;
            continue;
          }

          const { data: existing } = await supabase
            .from("automation_logs")
            .select("id")
            .eq("company_id", companyId)
            .eq("automation_id", automation.id)
            .eq("job_id", job.id)
            .eq("status", "sent")
            .gte("sent_at", sentSince)
            .limit(1);
          if (existing?.length) {
            results.skipped++;
            continue;
          }

          const message = replaceVariables(automation.message || "", {
            ClientName: customer.name || "Customer",
            CompanyName: companyName,
            JobDate: job.scheduled_date ? formatJobDate(job.scheduled_date) : "",
          });

          if (!await sendSms(supabaseUrl, serviceRoleKey, companyId, phone, message)) {
            results.errors.push(`Failed to send job automation ${automation.id} for ${job.id}`);
            continue;
          }

          const { error: logError } = await supabase.from("automation_logs").insert({
            company_id: companyId,
            automation_id: automation.id,
            job_id: job.id,
            customer_id: customer.id,
            trigger_type: automation.trigger_type,
            message_sent: message,
            sent_to: phone,
            sent_via: "sms",
            status: "sent",
            sent_at: new Date().toISOString(),
          });
          if (logError) results.errors.push(`Sent job ${job.id} but failed to persist automation log`);
          results.sent++;
        }
        continue;
      }

      const cutoff = targetDate(delayType, delayValue, "after");
      let invoicesQuery = supabase
        .from("invoices")
        .select("id, invoice_number, customer_id, created_at, customer:customers(id, name, phone, phone2, company_id)")
        .eq("company_id", companyId)
        .lte("created_at", cutoff.toISOString());
      if (automation.condition === "payment_no") invoicesQuery = invoicesQuery.neq("status", "paid");
      if (automation.condition === "payment_yes") invoicesQuery = invoicesQuery.eq("status", "paid");

      const { data: invoices, error } = await invoicesQuery;
      if (error) {
        results.errors.push(`Failed to fetch invoices for ${automation.id}`);
        continue;
      }

      for (const invoice of invoices || []) {
        const customer = customerFrom(invoice.customer as AutomationCustomer | AutomationCustomer[] | null);
        if (!customer) continue;
        const phone = recipient(customer, automation.message_to);
        if (!phone) {
          results.skipped++;
          continue;
        }

        const { data: existing } = await supabase
          .from("automation_logs")
          .select("id")
          .eq("company_id", companyId)
          .eq("automation_id", automation.id)
          .eq("invoice_id", invoice.id)
          .eq("status", "sent")
          .gte("sent_at", sentSince)
          .limit(1);
        if (existing?.length) {
          results.skipped++;
          continue;
        }

        const message = replaceVariables(automation.message || "", {
          ClientName: customer.name || "Customer",
          CompanyName: companyName,
          InvoiceNumber: invoice.invoice_number || invoice.id,
          InvoiceLink: `Invoice #${invoice.invoice_number || invoice.id}`,
        });

        if (!await sendSms(supabaseUrl, serviceRoleKey, companyId, phone, message)) {
          results.errors.push(`Failed to send invoice automation ${automation.id} for ${invoice.id}`);
          continue;
        }

        const { error: logError } = await supabase.from("automation_logs").insert({
          company_id: companyId,
          automation_id: automation.id,
          invoice_id: invoice.id,
          customer_id: customer.id,
          trigger_type: automation.trigger_type,
          message_sent: message,
          sent_to: phone,
          sent_via: "sms",
          status: "sent",
          sent_at: new Date().toISOString(),
        });
        if (logError) results.errors.push(`Sent invoice ${invoice.id} but failed to persist automation log`);
        results.sent++;
      }
    }

    return json({ success: true, ...results });
  } catch (error) {
    console.error("Error processing scheduled automations:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
