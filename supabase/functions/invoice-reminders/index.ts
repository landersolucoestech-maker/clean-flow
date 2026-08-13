import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { authorizeServiceRequest, getAuthorizedStaffIdentity } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const EMAIL_FROM = Deno.env.get("EMAIL_FROM");

interface InvoiceCustomer {
  name: string;
  email: string;
  payment_method: string | null;
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

function getInvoiceCustomer(customer: InvoiceCustomer | InvoiceCustomer[] | null | undefined): InvoiceCustomer | null {
  return Array.isArray(customer) ? customer[0] ?? null : customer ?? null;
}

function getPaymentInfo(paymentMethod: string | null, zelleKey: string | null, venmoKey: string | null): string {
  if (!paymentMethod) return "";
  const method = paymentMethod.toLowerCase();
  if (method === "zelle" && zelleKey) return `<p><strong>💳 Pay via Zelle:</strong> ${escapeHtml(zelleKey)}</p>`;
  if (method === "venmo" && venmoKey) return `<p><strong>💳 Pay via Venmo:</strong> ${escapeHtml(venmoKey)}</p>`;
  return "";
}

function reminderHtml(params: {
  customerName: string;
  invoiceNumber: string;
  total: number;
  dueDate: string;
  companyName: string;
  paymentInfo: string;
  overdue: boolean;
  daysOverdue?: number;
}): string {
  const { customerName, invoiceNumber, total, dueDate, companyName, paymentInfo, overdue, daysOverdue } = params;
  return overdue
    ? `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Payment Overdue</h2>
        <p>Dear ${escapeHtml(customerName)},</p>
        <p>Invoice <strong>${escapeHtml(invoiceNumber)}</strong> for <strong>$${total.toFixed(2)}</strong> was due on <strong>${escapeHtml(dueDate)}</strong>${daysOverdue == null ? "" : ` and is now <strong>${daysOverdue} days overdue</strong>`}.</p>
        ${paymentInfo}<p>Please make payment as soon as possible.</p>
        <p>If you have already made payment, please disregard this notice.</p>
        <p>Best regards,<br>${escapeHtml(companyName)}</p></div>`
    : `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Payment Reminder</h2>
        <p>Dear ${escapeHtml(customerName)},</p>
        <p>This is a friendly reminder that invoice <strong>${escapeHtml(invoiceNumber)}</strong> for <strong>$${total.toFixed(2)}</strong> is due on <strong>${escapeHtml(dueDate)}</strong>.</p>
        ${paymentInfo}<p>Please ensure timely payment.</p>
        <p>Thank you for your business!</p>
        <p>Best regards,<br>${escapeHtml(companyName)}</p></div>`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!EMAIL_FROM || !resendKey) return json({ error: "Email service is not configured" }, 503);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    const { action, invoiceId, type, company_id: requestedCompanyId } = body;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1] || "";
    const isServiceRequest = token === serviceRoleKey;

    let staffCompanyId: string | null = null;
    if (isServiceRequest) {
      const serviceError = authorizeServiceRequest(req);
      if (serviceError) return serviceError;
    } else {
      const authorization = await getAuthorizedStaffIdentity(req, supabase, ["admin", "office_manager"]);
      if (authorization.error) return authorization.error;
      staffCompanyId = authorization.identity.companyId;
      if (requestedCompanyId && requestedCompanyId !== staffCompanyId) return json({ error: "Company scope mismatch" }, 403);
    }

    const sendOne = async (params: {
      companyId: string;
      invoice: {
        id: string;
        invoice_number: string;
        total: number | null;
        due_date: string;
        customer: InvoiceCustomer | InvoiceCustomer[] | null;
      };
      reminderType: "upcoming" | "overdue";
      companyName: string;
      zelleKey: string | null;
      venmoKey: string | null;
      now: Date;
    }) => {
      const { companyId, invoice, reminderType, companyName, zelleKey, venmoKey, now } = params;
      const customer = getInvoiceCustomer(invoice.customer);
      if (!customer?.email) return false;

      const overdue = reminderType === "overdue";
      const dueDate = new Date(`${invoice.due_date}T12:00:00Z`);
      const daysOverdue = overdue ? Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / 86_400_000)) : undefined;
      const paymentInfo = getPaymentInfo(customer.payment_method, zelleKey, venmoKey);
      const result = await resend.emails.send({
        from: EMAIL_FROM,
        to: [customer.email],
        subject: safeHeader(overdue
          ? `OVERDUE: Invoice ${invoice.invoice_number}${daysOverdue == null ? "" : ` - ${daysOverdue} days past due`}`
          : `Reminder: Invoice ${invoice.invoice_number} is due soon`),
        html: reminderHtml({
          customerName: customer.name,
          invoiceNumber: invoice.invoice_number,
          total: Number(invoice.total || 0),
          dueDate: invoice.due_date,
          companyName,
          paymentInfo,
          overdue,
          daysOverdue,
        }),
      });
      if (result.error) throw new Error(result.error.message || "Resend delivery failed");

      const timestampColumn = overdue ? "overdue_reminder_sent_at" : "reminder_sent_at";
      const updateData: Record<string, unknown> = { [timestampColumn]: now.toISOString() };
      if (overdue) updateData.status = "overdue";
      const { error: updateError } = await supabase
        .from("invoices")
        .update(updateData)
        .eq("id", invoice.id)
        .eq("company_id", companyId);
      if (updateError) throw updateError;

      const { error: logError } = await supabase.from("invoice_reminders").insert({
        company_id: companyId,
        invoice_id: invoice.id,
        reminder_type: reminderType,
        email_to: customer.email,
      });
      if (logError) console.warn("Reminder sent but logging failed", logError);
      return true;
    };

    if (action === "send-reminders") {
      let companyIds: string[] = [];
      if (staffCompanyId) {
        companyIds = [staffCompanyId];
      } else if (typeof requestedCompanyId === "string" && requestedCompanyId) {
        companyIds = [requestedCompanyId];
      } else {
        const { data: companies, error: companiesError } = await supabase.from("company_settings").select("id");
        if (companiesError) throw companiesError;
        companyIds = (companies || []).map((company) => company.id);
      }

      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const threeDaysFromNow = new Date(now.getTime() + 3 * 86_400_000).toISOString().split("T")[0];
      let sentCount = 0;
      const errors: string[] = [];

      for (const companyId of companyIds) {
        try {
          const { data: settings, error: settingsError } = await supabase
            .from("company_settings")
            .select("zelle_payment_key, venmo_payment_key, trade_name, legal_name")
            .eq("id", companyId)
            .single();
          if (settingsError) throw settingsError;
          const companyName = settings.trade_name || settings.legal_name || "Our Company";
          const zelleKey = settings.zelle_payment_key || null;
          const venmoKey = settings.venmo_payment_key || null;

          const [upcomingResult, overdueResult] = await Promise.all([
            supabase.from("invoices")
              .select("id, invoice_number, total, due_date, customer:customers(name, email, payment_method)")
              .eq("company_id", companyId)
              .in("status", ["sent", "viewed"])
              .gte("due_date", today)
              .lte("due_date", threeDaysFromNow)
              .is("reminder_sent_at", null),
            supabase.from("invoices")
              .select("id, invoice_number, total, due_date, customer:customers(name, email, payment_method)")
              .eq("company_id", companyId)
              .in("status", ["sent", "viewed", "overdue"])
              .lt("due_date", today)
              .is("overdue_reminder_sent_at", null),
          ]);
          if (upcomingResult.error) throw upcomingResult.error;
          if (overdueResult.error) throw overdueResult.error;

          for (const invoice of upcomingResult.data || []) {
            try {
              if (await sendOne({ companyId, invoice, reminderType: "upcoming", companyName, zelleKey, venmoKey, now })) sentCount++;
            } catch (error) {
              errors.push(`${companyId}/${invoice.invoice_number}: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
          for (const invoice of overdueResult.data || []) {
            try {
              if (await sendOne({ companyId, invoice, reminderType: "overdue", companyName, zelleKey, venmoKey, now })) sentCount++;
            } catch (error) {
              errors.push(`${companyId}/${invoice.invoice_number}: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
        } catch (error) {
          errors.push(`${companyId}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return json({ success: true, sentCount, errors: errors.length ? errors : undefined });
    }

    if (action === "send-single") {
      if (typeof invoiceId !== "string" || !invoiceId) return json({ error: "invoiceId is required" }, 400);

      let companyId = staffCompanyId || (typeof requestedCompanyId === "string" ? requestedCompanyId : null);
      if (!companyId && isServiceRequest) {
        const { data: invoiceOwner, error: ownerError } = await supabase
          .from("invoices")
          .select("company_id")
          .eq("id", invoiceId)
          .single();
        if (ownerError || !invoiceOwner?.company_id) return json({ error: "Invoice not found" }, 404);
        companyId = invoiceOwner.company_id;
      }
      if (!companyId) return json({ error: "Company context is required" }, 400);

      const { data: settings, error: settingsError } = await supabase
        .from("company_settings")
        .select("zelle_payment_key, venmo_payment_key, trade_name, legal_name")
        .eq("id", companyId)
        .single();
      if (settingsError) throw settingsError;

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("id, invoice_number, total, due_date, customer:customers(name, email, payment_method)")
        .eq("id", invoiceId)
        .eq("company_id", companyId)
        .single();
      if (invoiceError || !invoice) return json({ error: "Invoice not found" }, 404);

      const reminderType: "upcoming" | "overdue" = type === "overdue" ? "overdue" : "upcoming";
      await sendOne({
        companyId,
        invoice,
        reminderType,
        companyName: settings.trade_name || settings.legal_name || "Our Company",
        zelleKey: settings.zelle_payment_key || null,
        venmoKey: settings.venmo_payment_key || null,
        now: new Date(),
      });
      return json({ success: true });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (error: unknown) {
    console.error("Reminder Error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
