import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { authorizeServiceRequest, getAuthorizedStaffIdentity } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceCustomer {
  id?: string;
  name: string | null;
  phone: string | null;
  phone2: string | null;
  payment_method: string | null;
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getInvoiceCustomer(customer: InvoiceCustomer | InvoiceCustomer[] | null | undefined): InvoiceCustomer | null {
  return Array.isArray(customer) ? customer[0] ?? null : customer ?? null;
}

function getPaymentInfo(paymentMethod: string | null, zelleKey: string | null, venmoKey: string | null): string {
  const method = paymentMethod?.toLowerCase();
  if (method === "zelle" && zelleKey) return `Pay via Zelle: ${zelleKey}. `;
  if (method === "venmo" && venmoKey) return `Pay via Venmo: ${venmoKey}. `;
  return "";
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "SMS reminder service is not configured" }, 503);

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    const { action, invoice_id, company_id: requestedCompanyId } = body;
    const accessToken = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    const isServiceRequest = accessToken === serviceRoleKey;

    let staffCompanyId: string | null = null;
    if (isServiceRequest) {
      const error = authorizeServiceRequest(req);
      if (error) return error;
    } else {
      const authorization = await getAuthorizedStaffIdentity(req, supabase, ["admin", "office_manager"]);
      if (authorization.error) return authorization.error;
      staffCompanyId = authorization.identity.companyId;
      if (requestedCompanyId && requestedCompanyId !== staffCompanyId) return json({ error: "Company scope mismatch" }, 403);
    }

    const sendInvoice = async (companyId: string, invoice: {
      id: string;
      invoice_number: string;
      total: number | null;
      due_date: string;
      status: string;
      customer: InvoiceCustomer | InvoiceCustomer[] | null;
    }, settings: { zelle_payment_key: string | null; venmo_payment_key: string | null; trade_name: string | null; legal_name: string | null }) => {
      const customer = getInvoiceCustomer(invoice.customer);
      const phone = customer?.phone || customer?.phone2;
      if (!customer || !phone) return false;

      const formattedPhone = formatPhone(phone);
      const isOverdue = invoice.status === "overdue" || new Date(`${invoice.due_date}T12:00:00`) < new Date();
      const companyName = settings.trade_name || settings.legal_name || "Our Company";
      const paymentInfo = getPaymentInfo(customer.payment_method, settings.zelle_payment_key, settings.venmo_payment_key);
      const triggerType = isOverdue ? "invoice_overdue_sms" : "invoice_reminder_sms";

      const { data: existing, error: existingError } = await supabase
        .from("automation_logs")
        .select("id")
        .eq("company_id", companyId)
        .eq("invoice_id", invoice.id)
        .eq("trigger_type", triggerType)
        .eq("sent_to", formattedPhone)
        .eq("sent_via", "sms")
        .eq("status", "sent")
        .limit(1)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) return true;

      const message = isOverdue
        ? `Hi ${customer.name || "Customer"}, invoice ${invoice.invoice_number} for $${Number(invoice.total || 0).toFixed(2)} is overdue. ${paymentInfo}Please pay ASAP. - ${companyName}`
        : `Hi ${customer.name || "Customer"}, reminder: invoice ${invoice.invoice_number} for $${Number(invoice.total || 0).toFixed(2)} is due on ${invoice.due_date}. ${paymentInfo}- ${companyName}`;

      const response = await fetch(`${supabaseUrl}/functions/v1/send-sms-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({ company_id: companyId, to_phone: formattedPhone, message }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(typeof payload?.error === "string" ? payload.error : `SMS delivery failed (${response.status})`);
      }

      const { error: logError } = await supabase.from("automation_logs").insert({
        company_id: companyId,
        trigger_type: triggerType,
        invoice_id: invoice.id,
        customer_id: customer.id,
        message_sent: message,
        sent_to: formattedPhone,
        sent_via: "sms",
        status: "sent",
        sent_at: new Date().toISOString(),
      });
      if (logError) console.warn("SMS reminder sent but logging failed", logError);
      return true;
    };

    const loadSettings = async (companyId: string) => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("zelle_payment_key, venmo_payment_key, trade_name, legal_name")
        .eq("id", companyId)
        .single();
      if (error || !data) throw error || new Error("Company settings not found");
      return data;
    };

    if (action === "send-single") {
      if (typeof invoice_id !== "string" || !invoice_id) return json({ error: "invoice_id is required" }, 400);

      let companyId = staffCompanyId || (typeof requestedCompanyId === "string" ? requestedCompanyId : null);
      if (!companyId && isServiceRequest) {
        const { data: owner, error } = await supabase.from("invoices").select("company_id").eq("id", invoice_id).single();
        if (error || !owner?.company_id) return json({ error: "Invoice not found" }, 404);
        companyId = owner.company_id;
      }
      if (!companyId) return json({ error: "Company context is required" }, 400);

      const [settings, invoiceResult] = await Promise.all([
        loadSettings(companyId),
        supabase.from("invoices")
          .select("id, invoice_number, total, due_date, status, customer:customers(id, name, phone, phone2, payment_method)")
          .eq("id", invoice_id)
          .eq("company_id", companyId)
          .single(),
      ]);
      if (invoiceResult.error || !invoiceResult.data) return json({ error: "Invoice not found" }, 404);
      const sent = await sendInvoice(companyId, invoiceResult.data, settings);
      if (!sent) return json({ error: "Customer has no phone number" }, 400);
      return json({ success: true, message: "SMS sent successfully" });
    }

    if (action === "send-batch") {
      let companyIds: string[] = [];
      if (staffCompanyId) companyIds = [staffCompanyId];
      else if (typeof requestedCompanyId === "string" && requestedCompanyId) companyIds = [requestedCompanyId];
      else {
        const { data, error } = await supabase.from("company_settings").select("id");
        if (error) throw error;
        companyIds = (data || []).map((company) => company.id);
      }

      const threeDaysFromNow = new Date(Date.now() + 3 * 86_400_000).toISOString().split("T")[0];
      let sentCount = 0;
      const errors: string[] = [];

      for (const companyId of companyIds) {
        try {
          const [settings, invoicesResult] = await Promise.all([
            loadSettings(companyId),
            supabase.from("invoices")
              .select("id, invoice_number, total, due_date, status, customer:customers(id, name, phone, phone2, payment_method)")
              .eq("company_id", companyId)
              .in("status", ["sent", "viewed", "overdue"])
              .lte("due_date", threeDaysFromNow),
          ]);
          if (invoicesResult.error) throw invoicesResult.error;

          for (const invoice of invoicesResult.data || []) {
            try {
              if (await sendInvoice(companyId, invoice, settings)) sentCount++;
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

    return json({ error: "Invalid action" }, 400);
  } catch (error) {
    console.error("Invoice SMS Reminder Error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
