import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { authorizeStaffRequest } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const EMAIL_FROM = Deno.env.get("EMAIL_FROM");

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeHeader(value: unknown): string {
  return String(value ?? "").replace(/[\r\n]+/g, " ").slice(0, 200);
}

interface Invoice {
  id: string;
  invoice_number: string;
  total: number;
  due_date: string;
  status: string;
  customer_id: string;
  customer?: {
    name: string;
    email: string;
    payment_method: string | null;
    preferred_language: string | null;
  };
}

interface CompanySettings {
  zelle_payment_key: string | null;
  venmo_payment_key: string | null;
  trade_name: string;
  preferred_language: string | null;
}

// Get payment info based on customer preference
function getPaymentInfo(
  paymentMethod: string | null,
  zelleKey: string | null,
  venmoKey: string | null
): string {
  if (!paymentMethod) return "";
  
  const method = paymentMethod.toLowerCase();
  
  if (method === "zelle" && zelleKey) {
    return `<p><strong>💳 Pay via Zelle:</strong> ${escapeHtml(zelleKey)}</p>`;
  }
  
  if (method === "venmo" && venmoKey) {
    return `<p><strong>💳 Pay via Venmo:</strong> ${escapeHtml(venmoKey)}</p>`;
  }
  
  return "";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!EMAIL_FROM || !Deno.env.get("RESEND_API_KEY")) {
      return new Response(JSON.stringify({ error: "Email service is not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authError = await authorizeStaffRequest(
      req,
      supabase,
      ["admin", "office_manager"],
      { allowServiceRole: true },
    );
    if (authError) return authError;

    // Parse body once and extract all needed fields
    const body = await req.json();
    const { action, invoiceId, type } = body;

    if (action === "send-reminders") {
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      // Fetch company settings for payment keys
      const { data: companySettings } = await supabase
        .from("company_settings")
        .select("zelle_payment_key, venmo_payment_key, trade_name, preferred_language")
        .maybeSingle();

      const zelleKey = companySettings?.zelle_payment_key || null;
      const venmoKey = companySettings?.venmo_payment_key || null;
      const companyName = companySettings?.trade_name || "Our Company";

      // Fetch upcoming invoices (due in next 3 days)
      const { data: upcomingInvoices } = await supabase
        .from("invoices")
        .select(`
          id, invoice_number, total, due_date, status, customer_id, reminder_sent_at,
          customer:customers(name, email, payment_method, preferred_language)
        `)
        .in("status", ["sent", "viewed"])
        .gte("due_date", now.toISOString().split("T")[0])
        .lte("due_date", threeDaysFromNow.toISOString().split("T")[0])
        .is("reminder_sent_at", null);

      // Fetch overdue invoices
      const { data: overdueInvoices } = await supabase
        .from("invoices")
        .select(`
          id, invoice_number, total, due_date, status, customer_id, overdue_reminder_sent_at,
          customer:customers(name, email, payment_method, preferred_language)
        `)
        .in("status", ["sent", "viewed", "overdue"])
        .lt("due_date", now.toISOString().split("T")[0])
        .is("overdue_reminder_sent_at", null);

      let sentCount = 0;
      const errors: string[] = [];

      // Send upcoming reminders
      for (const invoice of (upcomingInvoices || [])) {
        const customer = invoice.customer as { name: string; email: string; payment_method: string | null } | null;
        if (!customer?.email) continue;

        try {
          const paymentInfo = getPaymentInfo(customer.payment_method, zelleKey, venmoKey);

          await resend.emails.send({
            from: EMAIL_FROM,
            to: [customer.email],
            subject: safeHeader(`Reminder: Invoice ${invoice.invoice_number} is due soon`),
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a1a2e;">Payment Reminder</h2>
                <p>Dear ${escapeHtml(customer.name)},</p>
                <p>This is a friendly reminder that invoice <strong>${escapeHtml(invoice.invoice_number)}</strong> for <strong>$${invoice.total?.toFixed(2)}</strong> is due on <strong>${escapeHtml(invoice.due_date)}</strong>.</p>
                ${paymentInfo}
                <p>Please ensure timely payment to avoid any late fees.</p>
                <p>Thank you for your business!</p>
                <p>Best regards,<br>${escapeHtml(companyName)}</p>
              </div>
            `,
          });

          await supabase
            .from("invoices")
            .update({ reminder_sent_at: now.toISOString() })
            .eq("id", invoice.id);

          await supabase
            .from("invoice_reminders")
            .insert({
              invoice_id: invoice.id,
              reminder_type: "upcoming",
              email_to: customer.email,
            });

          sentCount++;
        } catch (err) {
          errors.push(`Failed to send reminder for ${invoice.invoice_number}: ${err}`);
        }
      }

      // Send overdue reminders
      for (const invoice of (overdueInvoices || [])) {
        const customer = invoice.customer as { name: string; email: string; payment_method: string | null } | null;
        if (!customer?.email) continue;

        try {
          const dueDate = new Date(invoice.due_date);
          const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000));
          const paymentInfo = getPaymentInfo(customer.payment_method, zelleKey, venmoKey);

          await resend.emails.send({
            from: EMAIL_FROM,
            to: [customer.email],
            subject: safeHeader(`OVERDUE: Invoice ${invoice.invoice_number} - ${daysOverdue} days past due`),
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc2626;">Payment Overdue</h2>
                <p>Dear ${escapeHtml(customer.name)},</p>
                <p>Invoice <strong>${escapeHtml(invoice.invoice_number)}</strong> for <strong>$${invoice.total?.toFixed(2)}</strong> was due on <strong>${escapeHtml(invoice.due_date)}</strong> and is now <strong>${daysOverdue} days overdue</strong>.</p>
                ${paymentInfo}
                <p>Please make payment as soon as possible to avoid further action.</p>
                <p>If you have already made payment, please disregard this notice.</p>
                <p>Thank you.</p>
                <p>Best regards,<br>${escapeHtml(companyName)}</p>
              </div>
            `,
          });

          await supabase
            .from("invoices")
            .update({ 
              overdue_reminder_sent_at: now.toISOString(),
              status: "overdue"
            })
            .eq("id", invoice.id);

          await supabase
            .from("invoice_reminders")
            .insert({
              invoice_id: invoice.id,
              reminder_type: "overdue",
              email_to: customer.email,
            });

          sentCount++;
        } catch (err) {
          errors.push(`Failed to send overdue reminder for ${invoice.invoice_number}: ${err}`);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          sentCount,
          errors: errors.length > 0 ? errors : undefined
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "send-single") {

      // Fetch company settings for payment keys
      const { data: companySettings } = await supabase
        .from("company_settings")
        .select("zelle_payment_key, venmo_payment_key, trade_name")
        .maybeSingle();

      const zelleKey = companySettings?.zelle_payment_key || null;
      const venmoKey = companySettings?.venmo_payment_key || null;
      const companyName = companySettings?.trade_name || "Our Company";

      const { data: invoice } = await supabase
        .from("invoices")
        .select(`
          id, invoice_number, total, due_date, status,
          customer:customers(name, email, payment_method)
        `)
        .eq("id", invoiceId)
        .single();

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      const customer = invoice.customer as { name: string; email: string; payment_method: string | null } | null;
      if (!customer?.email) {
        throw new Error("Customer email not found");
      }

      const isOverdue = type === "overdue";
      const subject = safeHeader(isOverdue
        ? `OVERDUE: Invoice ${invoice.invoice_number}` 
        : `Reminder: Invoice ${invoice.invoice_number} is due soon`);

      const paymentInfo = getPaymentInfo(customer.payment_method, zelleKey, venmoKey);

      await resend.emails.send({
        from: EMAIL_FROM,
        to: [customer.email],
        subject,
        html: isOverdue
          ? `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Payment Overdue</h2>
              <p>Dear ${escapeHtml(customer.name)},</p>
              <p>Invoice <strong>${escapeHtml(invoice.invoice_number)}</strong> for <strong>$${invoice.total?.toFixed(2)}</strong> is overdue.</p>
              ${paymentInfo}
              <p>Please make payment as soon as possible.</p>
              <p>Best regards,<br>${escapeHtml(companyName)}</p>
            </div>
          `
          : `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a1a2e;">Payment Reminder</h2>
              <p>Dear ${escapeHtml(customer.name)},</p>
              <p>Invoice <strong>${escapeHtml(invoice.invoice_number)}</strong> for <strong>$${invoice.total?.toFixed(2)}</strong> is due on <strong>${escapeHtml(invoice.due_date)}</strong>.</p>
              ${paymentInfo}
              <p>Please ensure timely payment.</p>
              <p>Best regards,<br>${escapeHtml(companyName)}</p>
            </div>
          `,
      });

      await supabase
        .from("invoice_reminders")
        .insert({
          invoice_id: invoiceId,
          reminder_type: type,
          email_to: customer.email,
        });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Reminder Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
