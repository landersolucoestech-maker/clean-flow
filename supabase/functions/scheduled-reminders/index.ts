import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { authorizeServiceRequest } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SupportedLanguage = "en" | "pt" | "es";
const LOCALES: Record<SupportedLanguage, string> = { en: "en-US", pt: "pt-BR", es: "es-ES" };

type Company = {
  id: string;
  trade_name: string | null;
  legal_name: string;
  phone: string | null;
  preferred_language: string | null;
};

type AutomationConfig = {
  id: string;
  company_id: string;
  delay_value: number | null;
  message_to: string;
  message: string;
};

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  phone2: string | null;
  preferred_language: string | null;
};

type Job = {
  id: string;
  customer_id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  customers: Customer | null;
};

type Invoice = {
  id: string;
  invoice_number: string;
  customer_id: string;
  total: number;
  status: string;
  created_at: string;
  customers: Customer | null;
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function resolveLanguage(customer: string | null | undefined, company: string | null | undefined): SupportedLanguage {
  const allowed: SupportedLanguage[] = ["en", "pt", "es"];
  if (customer && allowed.includes(customer as SupportedLanguage)) return customer as SupportedLanguage;
  if (company && allowed.includes(company as SupportedLanguage)) return company as SupportedLanguage;
  return "en";
}

function formatJobDate(value: string, language: SupportedLanguage): string {
  try {
    return new Date(`${value}T12:00:00Z`).toLocaleDateString(LOCALES[language], {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return value;
  }
}

function formatCurrency(amount: number, language: SupportedLanguage): string {
  return new Intl.NumberFormat(LOCALES[language], { style: "currency", currency: "USD" }).format(amount);
}

function targetPhone(config: AutomationConfig, customer: Customer): string | null {
  return config.message_to === "text_phone_2" ? customer.phone2 : customer.phone;
}

async function claim(
  supabase: SupabaseClient,
  companyId: string,
  configId: string,
  dedupeKey: string,
  target: { jobId?: string; invoiceId?: string; customerId: string; trigger: string },
): Promise<string | null> {
  const { data, error } = await supabase.rpc("claim_automation_delivery", {
    tenant_id: companyId,
    automation_config_id: configId,
    delivery_key: dedupeKey,
    target_job_id: target.jobId || null,
    target_invoice_id: target.invoiceId || null,
    target_customer_id: target.customerId,
    delivery_trigger_type: target.trigger,
  });
  if (error) throw error;
  return typeof data === "string" ? data : null;
}

async function finish(
  supabase: SupabaseClient,
  logId: string,
  companyId: string,
  status: "sent" | "failed",
  message: string,
  phone: string,
  providerId?: string,
  failure?: string,
): Promise<void> {
  const { error } = await supabase.rpc("finish_automation_delivery", {
    delivery_log_id: logId,
    tenant_id: companyId,
    delivery_status: status,
    delivered_message: message,
    delivered_to: phone,
    provider_id: providerId || null,
    failure_message: failure || null,
  });
  if (error) throw error;
}

async function sendSms(
  supabaseUrl: string,
  serviceRoleKey: string,
  companyId: string,
  phone: string,
  message: string,
): Promise<{ ok: boolean; providerId?: string; error?: string }> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/ringcentral-send-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ company_id: companyId, to_phone: phone, message }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: `RingCentral HTTP ${response.status}` };
    return { ok: true, providerId: typeof payload.message_id === "string" ? payload.message_id : undefined };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "RingCentral request failed" };
  }
}

async function recordConversationMessage(
  supabase: SupabaseClient,
  companyId: string,
  customerId: string,
  message: string,
): Promise<void> {
  let conversationId: string;
  const { data: existing, error: existingError } = await supabase
    .from("conversations")
    .select("id")
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    conversationId = existing.id;
  } else {
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({ company_id: companyId, customer_id: customerId })
      .select("id")
      .single();
    if (error || !created) throw error || new Error("Unable to create conversation");
    conversationId = created.id;
  }

  const { error: messageError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    content: message,
    sender_type: "user",
    read: true,
  });
  if (messageError) throw messageError;

  const { error: conversationError } = await supabase
    .from("conversations")
    .update({
      last_message: message.length > 100 ? `${message.slice(0, 100)}...` : message,
      last_message_at: new Date().toISOString(),
      unread: false,
    })
    .eq("id", conversationId)
    .eq("company_id", companyId);
  if (conversationError) throw conversationError;
}

async function jobReminders(
  supabase: SupabaseClient,
  supabaseUrl: string,
  serviceRoleKey: string,
  company: Company,
): Promise<Array<Record<string, unknown>>> {
  const { data: automation, error: configError } = await supabase
    .from("automation_configs")
    .select("id, company_id, delay_value, message_to, message")
    .eq("company_id", company.id)
    .eq("trigger_type", "time_before")
    .eq("enabled", true)
    .maybeSingle();
  if (configError) throw configError;
  if (!automation) return [];
  const config = automation as AutomationConfig;

  const targetDate = new Date();
  targetDate.setUTCDate(targetDate.getUTCDate() + (config.delay_value || 2));
  const targetDateStr = targetDate.toISOString().split("T")[0];

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("id, customer_id, scheduled_date, scheduled_time, customers(id, name, phone, phone2, preferred_language)")
    .eq("company_id", company.id)
    .eq("scheduled_date", targetDateStr)
    .eq("status", "scheduled");
  if (error) throw error;

  const results: Array<Record<string, unknown>> = [];
  for (const job of (jobs || []) as unknown as Job[]) {
    const customer = job.customers;
    if (!customer) continue;
    const phone = targetPhone(config, customer);
    if (!phone) {
      results.push({ jobId: job.id, sent: false, error: "No phone number" });
      continue;
    }

    const language = resolveLanguage(customer.preferred_language, company.preferred_language);
    const companyName = company.trade_name || company.legal_name || "Our Company";
    const message = config.message
      .replace(/{ClientName}/g, customer.name)
      .replace(/{CompanyName}/g, companyName)
      .replace(/{JobDate}/g, formatJobDate(job.scheduled_date, language))
      .replace(/{CompanyPhone}/g, company.phone || "");
    const dedupeKey = `job-reminder:${company.id}:${job.id}:${targetDateStr}`;
    const logId = await claim(supabase, company.id, config.id, dedupeKey, {
      jobId: job.id,
      customerId: customer.id,
      trigger: "scheduled_job_reminder",
    });
    if (!logId) {
      results.push({ jobId: job.id, sent: false, skipped: true, error: "Already processed" });
      continue;
    }

    const delivery = await sendSms(supabaseUrl, serviceRoleKey, company.id, phone, message);
    if (!delivery.ok) {
      await finish(supabase, logId, company.id, "failed", message, phone, undefined, delivery.error);
      results.push({ jobId: job.id, sent: false, error: delivery.error });
      continue;
    }

    try {
      await recordConversationMessage(supabase, company.id, customer.id, message);
      await finish(supabase, logId, company.id, "sent", message, phone, delivery.providerId);
      results.push({ jobId: job.id, sent: true, language, providerId: delivery.providerId });
    } catch (recordError) {
      // Provider already accepted the message. Preserve that fact so a retry does
      // not duplicate the SMS; reconciliation can repair local conversation state.
      await finish(
        supabase,
        logId,
        company.id,
        "sent",
        message,
        phone,
        delivery.providerId,
        recordError instanceof Error ? `Delivered; local record failed: ${recordError.message}` : "Delivered; local record failed",
      );
      results.push({ jobId: job.id, sent: true, warning: "Delivered but local conversation recording failed" });
    }
  }
  return results;
}

async function invoiceReminders(
  supabase: SupabaseClient,
  supabaseUrl: string,
  serviceRoleKey: string,
  siteUrl: string,
  company: Company,
): Promise<Array<Record<string, unknown>>> {
  const { data: automation, error: configError } = await supabase
    .from("automation_configs")
    .select("id, company_id, delay_value, message_to, message")
    .eq("company_id", company.id)
    .eq("trigger_type", "time_after")
    .eq("enabled", true)
    .maybeSingle();
  if (configError) throw configError;
  if (!automation) return [];
  const config = automation as AutomationConfig;

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - (config.delay_value || 3));

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, customer_id, total, status, created_at, customers(id, name, phone, phone2, preferred_language)")
    .eq("company_id", company.id)
    .in("status", ["pending", "sent"])
    .lt("created_at", cutoff.toISOString());
  if (error) throw error;

  const weekBucket = new Date().toISOString().slice(0, 10);
  const results: Array<Record<string, unknown>> = [];
  for (const invoice of (invoices || []) as unknown as Invoice[]) {
    const customer = invoice.customers;
    if (!customer) continue;
    const phone = targetPhone(config, customer);
    if (!phone) {
      results.push({ invoiceId: invoice.id, sent: false, error: "No phone number" });
      continue;
    }

    const language = resolveLanguage(customer.preferred_language, company.preferred_language);
    const companyName = company.trade_name || company.legal_name || "Our Company";
    const invoiceLink = new URL(`/invoices?invoice=${encodeURIComponent(invoice.id)}`, siteUrl).toString();
    const message = config.message
      .replace(/{ClientName}/g, customer.name)
      .replace(/{CompanyName}/g, companyName)
      .replace(/{InvoiceNumber}/g, invoice.invoice_number)
      .replace(/{InvoiceLink}/g, invoiceLink)
      .replace(/{Amount}/g, formatCurrency(Number(invoice.total || 0), language));

    // Seven-day window is encoded directly in the key so concurrent cron runs
    // cannot deliver duplicates within the same reminder period.
    const windowStart = new Date();
    windowStart.setUTCDate(windowStart.getUTCDate() - (windowStart.getUTCDay() || 7) + 1);
    const dedupeKey = `invoice-reminder:${company.id}:${invoice.id}:${windowStart.toISOString().slice(0, 10)}`;
    const logId = await claim(supabase, company.id, config.id, dedupeKey, {
      invoiceId: invoice.id,
      customerId: customer.id,
      trigger: "scheduled_invoice_reminder",
    });
    if (!logId) {
      results.push({ invoiceId: invoice.id, sent: false, skipped: true, error: "Already processed" });
      continue;
    }

    const delivery = await sendSms(supabaseUrl, serviceRoleKey, company.id, phone, message);
    if (!delivery.ok) {
      await finish(supabase, logId, company.id, "failed", message, phone, undefined, delivery.error);
      results.push({ invoiceId: invoice.id, sent: false, error: delivery.error });
      continue;
    }

    try {
      await recordConversationMessage(supabase, company.id, customer.id, message);
      const { error: reminderError } = await supabase.from("invoice_reminders").insert({
        invoice_id: invoice.id,
        reminder_type: "sms_payment_reminder",
        sent_at: new Date().toISOString(),
      });
      if (reminderError) throw reminderError;
      await finish(supabase, logId, company.id, "sent", message, phone, delivery.providerId);
      results.push({ invoiceId: invoice.id, sent: true, language, providerId: delivery.providerId });
    } catch (recordError) {
      await finish(
        supabase,
        logId,
        company.id,
        "sent",
        message,
        phone,
        delivery.providerId,
        recordError instanceof Error ? `Delivered; local record failed: ${recordError.message}` : "Delivered; local record failed",
      );
      results.push({ invoiceId: invoice.id, sent: true, warning: "Delivered but local reminder recording failed" });
    }
  }
  void weekBucket;
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authError = authorizeServiceRequest(req);
    if (authError) return authError;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const siteUrl = Deno.env.get("SITE_URL");
    if (!siteUrl) return json({ error: "SITE_URL is not configured" }, 503);

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { action } = await req.json();
    if (!["job-reminders", "invoice-reminders"].includes(action)) {
      return json({ error: "Invalid action. Use 'job-reminders' or 'invoice-reminders'" }, 400);
    }

    const { data: companies, error: companiesError } = await supabase
      .from("company_settings")
      .select("id, trade_name, legal_name, phone, preferred_language")
      .order("created_at");
    if (companiesError) throw companiesError;

    const allResults: Array<Record<string, unknown>> = [];
    for (const company of (companies || []) as Company[]) {
      const results = action === "job-reminders"
        ? await jobReminders(supabase, supabaseUrl, serviceRoleKey, company)
        : await invoiceReminders(supabase, supabaseUrl, serviceRoleKey, siteUrl, company);
      allResults.push(...results.map((result) => ({ companyId: company.id, ...result })));
    }

    return json({ action, processed: allResults.length, results: allResults });
  } catch (error: unknown) {
    console.error("Scheduled reminders error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown scheduled reminder error" }, 500);
  }
});
