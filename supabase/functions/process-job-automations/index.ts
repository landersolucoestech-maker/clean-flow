import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { authorizeServiceRequest } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TriggerType = "on_our_way" | "started" | "finished";

type AutomationCustomer = {
  id: string;
  name: string | null;
  phone: string | null;
  phone2: string | null;
  email: string | null;
  preferred_language: string | null;
};

type SupportedLanguage = "en" | "pt" | "es";

const LOCALES: Record<SupportedLanguage, string> = {
  en: "en-US",
  pt: "pt-BR",
  es: "es-ES",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function resolveLanguage(customerLanguage: string | null, companyLanguage: string | null): SupportedLanguage {
  const supported: SupportedLanguage[] = ["en", "pt", "es"];
  if (customerLanguage && supported.includes(customerLanguage as SupportedLanguage)) return customerLanguage as SupportedLanguage;
  if (companyLanguage && supported.includes(companyLanguage as SupportedLanguage)) return companyLanguage as SupportedLanguage;
  return "en";
}

function formatJobDate(date: string, language: SupportedLanguage): string {
  try {
    return new Date(`${date}T12:00:00Z`).toLocaleDateString(LOCALES[language], {
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

function renderMessage(message: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, "gi"), value),
    message,
  );
}

function customerFrom(value: AutomationCustomer | AutomationCustomer[] | null): AutomationCustomer | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authError = authorizeServiceRequest(req);
    if (authError) return authError;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Backend not configured" }, 503);

    const body = await req.json();
    const jobId = typeof body.job_id === "string" ? body.job_id : "";
    const triggerType = body.trigger_type as TriggerType | undefined;
    const requestedCompanyId = typeof body.company_id === "string" ? body.company_id : null;
    if (!jobId || !triggerType || !["on_our_way", "started", "finished"].includes(triggerType)) {
      return json({ error: "Valid job_id and trigger_type are required" }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, company_id, scheduled_date, customer:customers(id, name, phone, phone2, email, preferred_language, company_id)")
      .eq("id", jobId)
      .maybeSingle();

    if (jobError || !job?.company_id) return json({ error: "Job not found" }, 404);
    const companyId = job.company_id as string;
    if (requestedCompanyId && requestedCompanyId !== companyId) {
      return json({ error: "Cross-company automation is not allowed" }, 403);
    }

    const customer = customerFrom(job.customer as AutomationCustomer | AutomationCustomer[] | null);
    if (!customer) return json({ error: "No customer associated with job" }, 400);

    const { data: automation, error: automationError } = await supabase
      .from("automation_configs")
      .select("*")
      .eq("company_id", companyId)
      .eq("trigger_type", triggerType)
      .eq("enabled", true)
      .maybeSingle();
    if (automationError) return json({ error: "Failed to fetch automation config" }, 500);
    if (!automation) return json({ success: true, message: "No automation configured for this trigger" });

    const delayValue = Number(automation.delay_value || 0);
    if (delayValue > 0) {
      return json({
        success: true,
        message: "Automation has delay configured and will be processed by the scheduler",
        delay: { value: delayValue, type: automation.delay_type },
      });
    }

    const { data: settings } = await supabase
      .from("company_settings")
      .select("trade_name, legal_name, preferred_language")
      .eq("id", companyId)
      .maybeSingle();
    const companyName = settings?.trade_name || settings?.legal_name || "Our Team";
    const language = resolveLanguage(customer.preferred_language, settings?.preferred_language || null);

    let toPhone: string | null = null;
    let toEmail: string | null = null;
    if (automation.message_to === "text_phone_2") toPhone = customer.phone2;
    else if (automation.message_to === "email") toEmail = customer.email;
    else toPhone = customer.phone;
    if (!toPhone && !toEmail) return json({ error: "No contact information available for customer" }, 400);

    const sentTo = toPhone || toEmail || "";
    const sentVia = toPhone ? "sms" : "email";
    const { data: existing } = await supabase
      .from("automation_logs")
      .select("id")
      .eq("company_id", companyId)
      .eq("automation_id", automation.id)
      .eq("job_id", jobId)
      .eq("trigger_type", triggerType)
      .eq("sent_to", sentTo)
      .eq("sent_via", sentVia)
      .eq("status", "sent")
      .limit(1);
    if (existing?.length) {
      return json({ success: true, idempotent: true, automation_id: automation.id, message_sent: false });
    }

    const message = renderMessage(automation.message || "", {
      ClientName: customer.name || "Customer",
      CompanyName: companyName,
      JobDate: job.scheduled_date ? formatJobDate(job.scheduled_date, language) : "",
    });

    if (toPhone) {
      const response = await fetch(`${supabaseUrl}/functions/v1/ringcentral-send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({ company_id: companyId, to_phone: toPhone, message }),
      });
      await response.body?.cancel();
      if (!response.ok) return json({ error: "Failed to send SMS" }, 502);
    } else if (toEmail) {
      const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({ to: toEmail, subject: `${companyName}: service update`, text: message }),
      });
      await response.body?.cancel();
      if (!response.ok) return json({ error: "Failed to send email" }, 502);
    }

    const { error: logError } = await supabase.from("automation_logs").insert({
      company_id: companyId,
      automation_id: automation.id,
      job_id: jobId,
      customer_id: customer.id,
      trigger_type: triggerType,
      message_sent: message,
      sent_to: sentTo,
      sent_via: sentVia,
      status: "sent",
      sent_at: new Date().toISOString(),
    });
    if (logError) console.warn("Automation sent but log persistence failed", logError);

    return json({
      success: true,
      automation_id: automation.id,
      message_sent: true,
      sent_to: sentTo,
      sent_via: sentVia,
      language,
    });
  } catch (error) {
    console.error("Error processing automation:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
