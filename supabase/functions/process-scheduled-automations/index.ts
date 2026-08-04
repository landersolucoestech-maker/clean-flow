import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { authorizeServiceRequest } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AutomationCustomer {
  id: string;
  name: string | null;
  phone: string | null;
  phone_2: string | null;
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

// Format date for display
function formatJobDate(date: string): string {
  try {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

// Get current time in NY timezone
function getNYTime(): { date: Date; hour: number; minute: number } {
  const now = new Date();
  const nyFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  const parts = nyFormatter.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '00';
  
  return {
    date: now,
    hour: parseInt(getPart('hour')),
    minute: parseInt(getPart('minute')),
  };
}

// Check if current time matches the send_at_time
function isTimeToSend(sendAtTime: string | null): boolean {
  if (!sendAtTime) return true; // No specific time, always ok
  
  const nyTime = getNYTime();
  const [targetHour, targetMinute] = sendAtTime.split(':').map(Number);
  
  // Allow a 30-minute window for the scheduled time
  const currentMinutes = nyTime.hour * 60 + nyTime.minute;
  const targetMinutes = targetHour * 60 + (targetMinute || 0);
  
  return Math.abs(currentMinutes - targetMinutes) <= 30;
}

// Calculate the target date based on delay
function calculateTargetDate(delayType: string, delayValue: number, direction: 'before' | 'after'): Date {
  const now = new Date();
  let offsetMs = 0;
  
  if (delayType === 'hours') {
    offsetMs = delayValue * 60 * 60 * 1000;
  } else if (delayType === 'days') {
    offsetMs = delayValue * 24 * 60 * 60 * 1000;
  }
  
  if (direction === 'before') {
    return new Date(now.getTime() + offsetMs);
  } else {
    return new Date(now.getTime() - offsetMs);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authError = authorizeServiceRequest(req);
    if (authError) return authError;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Processing scheduled automations...");

    const results = {
      processed: 0,
      sent: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Get all enabled scheduled automations
    const { data: automations, error: automationsError } = await supabase
      .from("automation_configs")
      .select("*")
      .in("trigger_type", ["time_before", "time_after"])
      .eq("enabled", true);

    if (automationsError) {
      console.error("Error fetching automations:", automationsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch automations" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!automations || automations.length === 0) {
      console.log("No scheduled automations found");
      return new Response(
        JSON.stringify({ success: true, message: "No scheduled automations configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get company settings for company name
    const { data: companySettings } = await supabase
      .from("company_settings")
      .select("company_id, company_name")
      .limit(1)
      .single();

    const companyName = companySettings?.company_name || "Our Team";
    const companyId = companySettings?.company_id;

    for (const automation of automations) {
      results.processed++;
      
      // Check if it's time to send based on send_at_time
      if (!isTimeToSend(automation.send_at_time)) {
        console.log(`Skipping ${automation.label} - not the right time (configured: ${automation.send_at_time})`);
        results.skipped++;
        continue;
      }

      const delayType = automation.delay_type || "days";
      const delayValue = automation.delay_value || 0;

      if (automation.trigger_type === "time_before") {
        // Find jobs that are X days/hours in the future
        const targetDate = calculateTargetDate(delayType, delayValue, 'before');
        const targetDateStr = targetDate.toISOString().split('T')[0];
        
        console.log(`Looking for jobs on ${targetDateStr} for "${automation.label}"`);

        const { data: jobs, error: jobsError } = await supabase
          .from("jobs")
          .select(`
            *,
            customers (
              id,
              name,
              phone,
              phone_2,
              email
            )
          `)
          .eq("date", targetDateStr)
          .in("status", ["scheduled", "pending"]);

        if (jobsError) {
          console.error("Error fetching jobs:", jobsError);
          results.errors.push(`Failed to fetch jobs for ${automation.label}`);
          continue;
        }

        for (const job of jobs || []) {
          const customer = job.customers as AutomationCustomer | null;
          if (!customer) continue;

          // Check if we already sent this automation for this job today
          const { data: existingLog } = await supabase
            .from("automation_logs")
            .select("id")
            .eq("automation_id", automation.id)
            .eq("job_id", job.id)
            .gte("sent_at", new Date().toISOString().split('T')[0])
            .limit(1);

          if (existingLog && existingLog.length > 0) {
            console.log(`Already sent ${automation.label} for job ${job.id} today`);
            results.skipped++;
            continue;
          }

          // Determine recipient
          let toPhone: string | null = null;
          switch (automation.message_to) {
            case "text_phone_1":
              toPhone = customer.phone;
              break;
            case "text_phone_2":
              toPhone = customer.phone_2;
              break;
            default:
              toPhone = customer.phone;
          }

          if (!toPhone) {
            console.log("Skipping reminder because customer has no phone");
            continue;
          }

          // Replace variables
          const message = replaceVariables(automation.message, {
            clientName: customer.name || "Customer",
            companyName,
            jobDate: job.date ? formatJobDate(job.date) : "",
          });

          // Send SMS
          try {
            const sendResponse = await fetch(`${supabaseUrl}/functions/v1/ringcentral-send-message`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                company_id: companyId,
                to_phone: toPhone,
                message,
              }),
            });

            if (sendResponse.ok) {
              console.log(`Sent reminder for job ${job.id}`);
              results.sent++;

              // Log the automation
              await supabase.from("automation_logs").insert({
                automation_id: automation.id,
                job_id: job.id,
                customer_id: customer.id,
                trigger_type: automation.trigger_type,
                message_sent: message,
                sent_to: toPhone,
                sent_via: "sms",
                status: "sent",
              });
            } else {
              const errorText = await sendResponse.text();
              console.error(`Failed to send SMS for job ${job.id}:`, errorText);
              results.errors.push(`Failed to send for job ${job.id}`);
            }
          } catch (sendError) {
            console.error(`Error sending SMS:`, sendError);
            results.errors.push(`Error sending for job ${job.id}`);
          }
        }
      } else if (automation.trigger_type === "time_after") {
        // Find invoices that were created X days/hours ago
        const targetDate = calculateTargetDate(delayType, delayValue, 'after');
        const targetDateStr = targetDate.toISOString().split('T')[0];
        
        console.log(`Looking for invoices from ${targetDateStr} for "${automation.label}"`);

        // Build the query based on condition
        let invoicesQuery = supabase
          .from("invoices")
          .select(`
            *,
            customers (
              id,
              name,
              phone,
              phone_2,
              email
            )
          `)
          .lte("created_at", targetDate.toISOString());

        // Apply condition filter
        if (automation.condition === "payment_no") {
          invoicesQuery = invoicesQuery.neq("status", "paid");
        } else if (automation.condition === "payment_yes") {
          invoicesQuery = invoicesQuery.eq("status", "paid");
        }

        const { data: invoices, error: invoicesError } = await invoicesQuery;

        if (invoicesError) {
          console.error("Error fetching invoices:", invoicesError);
          results.errors.push(`Failed to fetch invoices for ${automation.label}`);
          continue;
        }

        for (const invoice of invoices || []) {
          const customer = invoice.customers as AutomationCustomer | null;
          if (!customer) continue;

          // Check if we already sent this automation for this invoice today
          const { data: existingLog } = await supabase
            .from("automation_logs")
            .select("id")
            .eq("automation_id", automation.id)
            .eq("invoice_id", invoice.id)
            .gte("sent_at", new Date().toISOString().split('T')[0])
            .limit(1);

          if (existingLog && existingLog.length > 0) {
            console.log(`Already sent ${automation.label} for invoice ${invoice.id} today`);
            results.skipped++;
            continue;
          }

          // Determine recipient
          let toPhone: string | null = null;
          switch (automation.message_to) {
            case "text_phone_1":
              toPhone = customer.phone;
              break;
            case "text_phone_2":
              toPhone = customer.phone_2;
              break;
            default:
              toPhone = customer.phone;
          }

          if (!toPhone) {
            console.log("Skipping payment reminder because customer has no phone");
            continue;
          }

          // Replace variables
          const message = replaceVariables(automation.message, {
            clientName: customer.name || "Customer",
            companyName,
            invoiceNumber: invoice.invoice_number || invoice.id,
            invoiceLink: invoice.payment_link || `Invoice #${invoice.invoice_number}`,
          });

          // Send SMS
          try {
            const sendResponse = await fetch(`${supabaseUrl}/functions/v1/ringcentral-send-message`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                company_id: companyId,
                to_phone: toPhone,
                message,
              }),
            });

            if (sendResponse.ok) {
              console.log(`Sent payment reminder for invoice ${invoice.id}`);
              results.sent++;

              // Log the automation
              await supabase.from("automation_logs").insert({
                automation_id: automation.id,
                invoice_id: invoice.id,
                customer_id: customer.id,
                trigger_type: automation.trigger_type,
                message_sent: message,
                sent_to: toPhone,
                sent_via: "sms",
                status: "sent",
              });
            } else {
              const errorText = await sendResponse.text();
              console.error(`Failed to send SMS for invoice ${invoice.id}:`, errorText);
              results.errors.push(`Failed to send for invoice ${invoice.id}`);
            }
          } catch (sendError) {
            console.error(`Error sending SMS:`, sendError);
            results.errors.push(`Error sending for invoice ${invoice.id}`);
          }
        }
      }
    }

    console.log("Scheduled automations complete:", results);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing scheduled automations:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
