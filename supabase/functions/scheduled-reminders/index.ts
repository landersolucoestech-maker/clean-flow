import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authorizeServiceRequest } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SupportedLanguage = "en" | "pt" | "es";

const LOCALES: Record<SupportedLanguage, string> = {
  en: "en-US",
  pt: "pt-BR",
  es: "es-ES",
};

interface AutomationConfig {
  id: string;
  trigger_type: string;
  label: string;
  delay_type: string | null;
  delay_value: number | null;
  send_at_time: string | null;
  condition: string | null;
  message_to: string;
  message: string;
  enabled: boolean;
}

interface Job {
  id: string;
  customer_id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  customers: {
    id: string;
    name: string;
    phone: string | null;
    phone2: string | null;
    preferred_language: string | null;
  } | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  total: number;
  status: string;
  created_at: string;
  customers: {
    id: string;
    name: string;
    phone: string | null;
    phone2: string | null;
    preferred_language: string | null;
  } | null;
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

// Format date based on language
function formatJobDate(dateStr: string, language: SupportedLanguage): string {
  try {
    const date = new Date(dateStr);
    const locale = LOCALES[language] || LOCALES.en;
    
    return date.toLocaleDateString(locale, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// Format currency based on language
function formatCurrency(amount: number, language: SupportedLanguage): string {
  const locale = LOCALES[language] || LOCALES.en;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authError = authorizeServiceRequest(req);
    if (authError) return authError;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const siteUrl = Deno.env.get("SITE_URL");
    if (!siteUrl) {
      return new Response(JSON.stringify({ error: "SITE_URL is not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action } = await req.json();

    // Get company settings including preferred_language
    const { data: companySettings } = await supabase
      .from("company_settings")
      .select("id, trade_name, legal_name, phone, preferred_language")
      .limit(1)
      .single();

    const companyName = companySettings?.trade_name || companySettings?.legal_name || "Our Company";
    const companyPhone = companySettings?.phone || "";
    const companyLanguage = companySettings?.preferred_language as SupportedLanguage | null;

    if (action === "job-reminders") {
      // Process Job Date Reminders
      const { data: automation } = await supabase
        .from("automation_configs")
        .select("*")
        .eq("trigger_type", "time_before")
        .eq("enabled", true)
        .single();

      if (!automation) {
        return new Response(
          JSON.stringify({ message: "Job reminder automation is disabled" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const config = automation as AutomationConfig;
      const delayDays = config.delay_value || 2;

      // Calculate target date
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + delayDays);
      const targetDateStr = targetDate.toISOString().split("T")[0];

      // Get jobs scheduled for the target date with customer preferred_language
      const { data: jobs, error: jobsError } = await supabase
        .from("jobs")
        .select(`
          id,
          customer_id,
          scheduled_date,
          scheduled_time,
          customers (
            id,
            name,
            phone,
            phone2,
            preferred_language
          )
        `)
        .eq("scheduled_date", targetDateStr)
        .eq("status", "scheduled");

      if (jobsError) throw jobsError;

      const results: Array<{ jobId: string; sent: boolean; error?: string; language?: string }> = [];

      for (const job of (jobs || []) as unknown as Job[]) {
        const customer = job.customers;
        if (!customer) continue;

        const phone = config.message_to === "text_phone_2" 
          ? customer.phone2 
          : customer.phone;

        if (!phone) {
          results.push({ jobId: job.id, sent: false, error: "No phone number" });
          continue;
        }

        // Check if reminder already sent for this job
        const { data: existingReminder } = await supabase
          .from("messages")
          .select("id")
          .eq("conversation_id", job.customer_id)
          .ilike("content", "%reminder for your cleaning%")
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (existingReminder && existingReminder.length > 0) {
          results.push({ jobId: job.id, sent: false, error: "Reminder already sent" });
          continue;
        }

        // Resolve language for this customer
        const messageLanguage = resolveLanguage(customer.preferred_language, companyLanguage);
        
        // Format date using customer's language
        const jobDate = formatJobDate(job.scheduled_date, messageLanguage);

        // Replace variables
        const message = config.message
          .replace(/{ClientName}/g, customer.name)
          .replace(/{CompanyName}/g, companyName)
          .replace(/{JobDate}/g, jobDate)
          .replace(/{CompanyPhone}/g, companyPhone);

        // Get or create conversation
        let conversationId: string;
        const { data: existingConversation } = await supabase
          .from("conversations")
          .select("id")
          .eq("customer_id", customer.id)
          .maybeSingle();

        if (existingConversation) {
          conversationId = existingConversation.id;
        } else {
          const { data: newConversation, error: convError } = await supabase
            .from("conversations")
            .insert({ customer_id: customer.id })
            .select()
            .single();

          if (convError) throw convError;
          conversationId = newConversation.id;
        }

        // Save message to database
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          content: message,
          sender_type: "user",
          read: true,
        });

        // Update conversation
        await supabase
          .from("conversations")
          .update({
            last_message: message.length > 100 ? message.slice(0, 100) + "..." : message,
            last_message_at: new Date().toISOString(),
            unread: false,
          })
          .eq("id", conversationId);

        // Send SMS via RingCentral
        try {
          const response = await fetch(
            `${supabaseUrl}/functions/v1/ringcentral-send-message`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                company_id: companySettings?.id,
                to_phone: phone,
                message: message,
              }),
            }
          );

          if (response.ok) {
            results.push({ jobId: job.id, sent: true, language: messageLanguage });
          } else {
            results.push({ jobId: job.id, sent: false, error: "SMS send failed" });
          }
        } catch (smsError) {
          console.error("SMS send error:", smsError);
          results.push({ jobId: job.id, sent: false, error: "SMS exception" });
        }
      }

      return new Response(
        JSON.stringify({ action: "job-reminders", processed: results.length, results }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "invoice-reminders") {
      // Process Invoice Payment Reminders
      const { data: automation } = await supabase
        .from("automation_configs")
        .select("*")
        .eq("trigger_type", "time_after")
        .eq("enabled", true)
        .single();

      if (!automation) {
        return new Response(
          JSON.stringify({ message: "Invoice reminder automation is disabled" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const config = automation as AutomationConfig;
      const delayDays = config.delay_value || 3;

      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - delayDays);
      const cutoffDateStr = cutoffDate.toISOString();

      // Get unpaid invoices with customer preferred_language
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          customer_id,
          total,
          status,
          created_at,
          customers (
            id,
            name,
            phone,
            phone2,
            preferred_language
          )
        `)
        .in("status", ["pending", "sent"])
        .lt("created_at", cutoffDateStr);

      if (invoicesError) throw invoicesError;

      const results: Array<{ invoiceId: string; sent: boolean; error?: string; language?: string }> = [];

      for (const invoice of (invoices || []) as unknown as Invoice[]) {
        const customer = invoice.customers;
        if (!customer) continue;

        const phone = config.message_to === "text_phone_2" 
          ? customer.phone2 
          : customer.phone;

        if (!phone) {
          results.push({ invoiceId: invoice.id, sent: false, error: "No phone number" });
          continue;
        }

        // Check if reminder already sent for this invoice recently
        const { data: existingReminder } = await supabase
          .from("invoice_reminders")
          .select("id")
          .eq("invoice_id", invoice.id)
          .gte("sent_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (existingReminder && existingReminder.length > 0) {
          results.push({ invoiceId: invoice.id, sent: false, error: "Reminder already sent this week" });
          continue;
        }

        // Resolve language for this customer
        const messageLanguage = resolveLanguage(customer.preferred_language, companyLanguage);

        // Format currency using customer's language
        const formattedAmount = formatCurrency(invoice.total, messageLanguage);

        const invoiceLink = new URL(`/invoices?invoice=${encodeURIComponent(invoice.id)}`, siteUrl).toString();

        // Replace variables
        const message = config.message
          .replace(/{ClientName}/g, customer.name)
          .replace(/{CompanyName}/g, companyName)
          .replace(/{InvoiceNumber}/g, invoice.invoice_number)
          .replace(/{InvoiceLink}/g, invoiceLink)
          .replace(/{Amount}/g, formattedAmount);

        // Get or create conversation
        let conversationId: string;
        const { data: existingConversation } = await supabase
          .from("conversations")
          .select("id")
          .eq("customer_id", customer.id)
          .maybeSingle();

        if (existingConversation) {
          conversationId = existingConversation.id;
        } else {
          const { data: newConversation, error: convError } = await supabase
            .from("conversations")
            .insert({ customer_id: customer.id })
            .select()
            .single();

          if (convError) throw convError;
          conversationId = newConversation.id;
        }

        // Save message to database
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          content: message,
          sender_type: "user",
          read: true,
        });

        // Update conversation
        await supabase
          .from("conversations")
          .update({
            last_message: message.length > 100 ? message.slice(0, 100) + "..." : message,
            last_message_at: new Date().toISOString(),
            unread: false,
          })
          .eq("id", conversationId);

        // Log reminder
        await supabase.from("invoice_reminders").insert({
          invoice_id: invoice.id,
          reminder_type: "sms_payment_reminder",
          sent_at: new Date().toISOString(),
        });

        // Send SMS via RingCentral
        try {
          const response = await fetch(
            `${supabaseUrl}/functions/v1/ringcentral-send-message`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                company_id: companySettings?.id,
                to_phone: phone,
                message: message,
              }),
            }
          );

          if (response.ok) {
            results.push({ invoiceId: invoice.id, sent: true, language: messageLanguage });
          } else {
            results.push({ invoiceId: invoice.id, sent: false, error: "SMS send failed" });
          }
        } catch (smsError) {
          console.error("SMS send error:", smsError);
          results.push({ invoiceId: invoice.id, sent: false, error: "SMS exception" });
        }
      }

      return new Response(
        JSON.stringify({ action: "invoice-reminders", processed: results.length, results }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'job-reminders' or 'invoice-reminders'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Scheduled reminders error:", error);
    const message = error instanceof Error ? error.message : "Unknown scheduled reminder error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
