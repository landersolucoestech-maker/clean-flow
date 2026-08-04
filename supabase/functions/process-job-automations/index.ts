import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessAutomationRequest {
  job_id: string;
  trigger_type: "on_our_way" | "started" | "finished";
  company_id?: string;
}

interface AutomationCustomer {
  id: string;
  name: string | null;
  phone: string | null;
  phone2: string | null;
  email: string | null;
  preferred_language: string | null;
}

type SupportedLanguage = "en" | "pt" | "es";

const LOCALES: Record<SupportedLanguage, string> = {
  en: "en-US",
  pt: "pt-BR",
  es: "es-ES",
};

// Format date based on language
function formatJobDate(dateStr: string, language: SupportedLanguage): string {
  try {
    const date = new Date(dateStr);
    const locale = LOCALES[language] || LOCALES.en;
    
    return date.toLocaleDateString(locale, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// Replace template variables in message
function replaceVariables(
  message: string,
  data: {
    clientName?: string;
    companyName?: string;
    jobDate?: string;
    invoiceNumber?: string;
    invoiceLink?: string;
    estimateLink?: string;
    contractLink?: string;
    receiptLink?: string;
  }
): string {
  let result = message;
  
  if (data.clientName) {
    result = result.replace(/\{ClientName\}/gi, data.clientName);
  }
  if (data.companyName) {
    result = result.replace(/\{CompanyName\}/gi, data.companyName);
  }
  if (data.jobDate) {
    result = result.replace(/\{JobDate\}/gi, data.jobDate);
  }
  if (data.invoiceNumber) {
    result = result.replace(/\{InvoiceNumber\}/gi, data.invoiceNumber);
  }
  if (data.invoiceLink) {
    result = result.replace(/\{InvoiceLink\}/gi, data.invoiceLink);
  }
  if (data.estimateLink) {
    result = result.replace(/\{EstimateLink\}/gi, data.estimateLink);
  }
  if (data.contractLink) {
    result = result.replace(/\{ContractLink\}/gi, data.contractLink);
  }
  if (data.receiptLink) {
    result = result.replace(/\{ReceiptLink\}/gi, data.receiptLink);
  }
  
  return result;
}

// Resolve language: customer > company > 'en'
function resolveLanguage(
  customerLang: string | null | undefined,
  companyLang: string | null | undefined
): SupportedLanguage {
  const valid: SupportedLanguage[] = ["en", "pt", "es"];
  
  if (customerLang && valid.includes(customerLang as SupportedLanguage)) {
    return customerLang as SupportedLanguage;
  }
  if (companyLang && valid.includes(companyLang as SupportedLanguage)) {
    return companyLang as SupportedLanguage;
  }
  return "en";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { job_id, trigger_type, company_id }: ProcessAutomationRequest = await req.json();

    if (!job_id || !trigger_type) {
      return new Response(
        JSON.stringify({ error: "job_id and trigger_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing automation for job ${job_id}, trigger: ${trigger_type}`);

    // Get automation config for this trigger
    const { data: automation, error: automationError } = await supabase
      .from("automation_configs")
      .select("*")
      .eq("trigger_type", trigger_type)
      .eq("enabled", true)
      .maybeSingle();

    if (automationError) {
      console.error("Error fetching automation config:", automationError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch automation config" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!automation) {
      console.log(`No enabled automation found for trigger: ${trigger_type}`);
      return new Response(
        JSON.stringify({ success: true, message: "No automation configured for this trigger" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check delay - if delay_value > 0, this should be scheduled, not sent immediately
    const delayValue = automation.delay_value || 0;
    if (delayValue > 0) {
      console.log(`Automation has delay of ${delayValue} ${automation.delay_type || 'hours'}, skipping immediate send`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Automation has delay configured, will be processed by scheduler",
          delay: { value: delayValue, type: automation.delay_type }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get job details with customer info including preferred_language
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select(`
        *,
        customers (
          id,
          name,
          phone,
          phone2,
          email,
          preferred_language
        )
      `)
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      console.error("Error fetching job:", jobError);
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customer = job.customers as AutomationCustomer | null;
    if (!customer) {
      console.error("No customer found for job");
      return new Response(
        JSON.stringify({ error: "No customer associated with job" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get company settings for company name and language
    const resolvedCompanyId = company_id || job.company_id;
    let companyName = "Our Team";
    let companyLanguage: string | null = null;
    
    const { data: companySettings } = await supabase
      .from("company_settings")
      .select("trade_name, legal_name, preferred_language")
      .limit(1)
      .single();
    
    if (companySettings) {
      companyName = companySettings.trade_name || companySettings.legal_name || "Our Team";
      companyLanguage = companySettings.preferred_language;
    }

    // Resolve language for this message
    const messageLanguage = resolveLanguage(customer.preferred_language, companyLanguage);
    console.log(`Using language: ${messageLanguage} (customer: ${customer.preferred_language}, company: ${companyLanguage})`);

    // Determine which phone/email to send to based on message_to
    let toPhone: string | null = null;
    let toEmail: string | null = null;

    switch (automation.message_to) {
      case "text_phone_1":
        toPhone = customer.phone;
        break;
      case "text_phone_2":
        toPhone = customer.phone2;
        break;
      case "email":
        toEmail = customer.email;
        break;
      default:
        toPhone = customer.phone;
    }

    if (!toPhone && !toEmail) {
      console.error("No contact info available for customer");
      return new Response(
        JSON.stringify({ error: "No contact information available for customer" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format job date using resolved language
    const formattedJobDate = job.scheduled_date 
      ? formatJobDate(job.scheduled_date, messageLanguage)
      : "";

    // Replace variables in message
    const message = replaceVariables(automation.message, {
      clientName: customer.name || "Customer",
      companyName,
      jobDate: formattedJobDate,
    });

    console.log(`Sending automation message to: ${toPhone || toEmail}`);
    console.log(`Message: ${message.substring(0, 100)}...`);

    // Send SMS via RingCentral if we have a phone
    if (toPhone) {
      const sendMessageUrl = `${supabaseUrl}/functions/v1/ringcentral-send-message`;
      
      const sendResponse = await fetch(sendMessageUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          company_id: resolvedCompanyId,
          to_phone: toPhone,
          message,
        }),
      });

      if (!sendResponse.ok) {
        const errorText = await sendResponse.text();
        console.error("Failed to send SMS:", errorText);
        return new Response(
          JSON.stringify({ error: "Failed to send SMS", details: errorText }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const sendResult = await sendResponse.json();
      console.log("SMS sent successfully:", sendResult);

      // Log the automation execution
      try {
        await supabase.from("automation_logs").insert({
          automation_id: automation.id,
          job_id,
          customer_id: customer.id,
          trigger_type,
          message_sent: message,
          sent_to: toPhone,
          sent_via: "sms",
          status: "sent",
          sent_at: new Date().toISOString(),
        });
      } catch (logErr) {
        console.warn("Could not log automation:", logErr);
      }

      return new Response(
        JSON.stringify({
          success: true,
          automation_id: automation.id,
          message_sent: true,
          sent_to: toPhone,
          sent_via: "sms",
          language: messageLanguage,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TODO: Handle email sending if needed
    if (toEmail) {
      console.log(`Email automation not yet implemented. Would send to: ${toEmail}`);
      return new Response(
        JSON.stringify({
          success: true,
          automation_id: automation.id,
          message_sent: false,
          reason: "Email sending not yet implemented",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing automation:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
