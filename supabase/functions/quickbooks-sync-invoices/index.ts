import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { getAuthorizedStaffIdentity } from "../_shared/authorize.ts";
import { getQuickBooksConnection, quickBooksHeaders } from "../_shared/quickbooks.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QUICKBOOKS_BASE_URL = "https://quickbooks.api.intuit.com/v3/company";

type QuickBooksInvoice = {
  Id: string;
  DocNumber: string;
  CustomerRef: { value: string; name: string };
  TotalAmt: number;
  Balance: number;
  DueDate: string;
  TxnDate: string;
  EmailStatus: string;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function mapQBStatusToLocal(invoice: QuickBooksInvoice): string {
  if (invoice.Balance === 0) return "paid";
  if (invoice.DueDate && new Date(invoice.DueDate) < new Date()) return "overdue";
  if (invoice.EmailStatus === "Viewed") return "viewed";
  return "sent";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Backend not configured" }, 503);

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const authorization = await getAuthorizedStaffIdentity(req, supabase, ["admin", "office_manager"]);
    if (authorization.error) return authorization.error;
    const companyId = authorization.identity.companyId;

    const body = await req.json();
    const action = body.action;
    const connection = await getQuickBooksConnection(supabase, companyId);
    const realmId = connection.realm_id;
    const headers = quickBooksHeaders(connection.access_token);

    if (action === "sync-all") {
      const response = await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/query?query=SELECT * FROM Invoice ORDERBY MetaData.LastUpdatedTime DESC MAXRESULTS 500&minorversion=65`,
        { headers },
      );
      if (!response.ok) throw new Error(`QuickBooks API error: ${response.status}`);

      const result = await response.json();
      const qbInvoices = (result.QueryResponse?.Invoice || []) as QuickBooksInvoice[];
      let updated = 0;

      for (const qbInvoice of qbInvoices) {
        const { data: existingInvoice } = await supabase
          .from("invoices")
          .select("id")
          .eq("company_id", companyId)
          .eq("qb_invoice_id", qbInvoice.Id)
          .maybeSingle();
        if (!existingInvoice) continue;

        const { error } = await supabase
          .from("invoices")
          .update({
            status: mapQBStatusToLocal(qbInvoice),
            qb_doc_number: qbInvoice.DocNumber,
            qb_email_status: qbInvoice.EmailStatus,
            qb_balance: qbInvoice.Balance,
            qb_synced_at: new Date().toISOString(),
          })
          .eq("id", existingInvoice.id)
          .eq("company_id", companyId);
        if (error) throw error;
        updated++;
      }

      return json({ success: true, synced: qbInvoices.length, updated });
    }

    if (action === "sync-single") {
      const invoiceId = typeof body.invoiceId === "string" ? body.invoiceId : "";
      const qbInvoiceId = typeof body.qbInvoiceId === "string" ? body.qbInvoiceId : "";
      if (!invoiceId || !qbInvoiceId) return json({ error: "invoiceId and qbInvoiceId are required" }, 400);

      const { data: localInvoice, error: localError } = await supabase
        .from("invoices")
        .select("id, qb_invoice_id")
        .eq("id", invoiceId)
        .eq("company_id", companyId)
        .maybeSingle();
      if (localError || !localInvoice) return json({ error: "Invoice not found" }, 404);
      if (localInvoice.qb_invoice_id && localInvoice.qb_invoice_id !== qbInvoiceId) {
        return json({ error: "QuickBooks invoice identity mismatch" }, 409);
      }

      const response = await fetch(`${QUICKBOOKS_BASE_URL}/${realmId}/invoice/${qbInvoiceId}?minorversion=65`, { headers });
      if (!response.ok) throw new Error(`QuickBooks API error: ${response.status}`);
      const qbInvoice = (await response.json()).Invoice as QuickBooksInvoice;
      const status = mapQBStatusToLocal(qbInvoice);

      const { error } = await supabase
        .from("invoices")
        .update({
          status,
          qb_invoice_id: qbInvoice.Id,
          qb_doc_number: qbInvoice.DocNumber,
          qb_email_status: qbInvoice.EmailStatus,
          qb_balance: qbInvoice.Balance,
          qb_synced_at: new Date().toISOString(),
        })
        .eq("id", invoiceId)
        .eq("company_id", companyId);
      if (error) throw error;
      return json({ success: true, status });
    }

    if (action === "mark-paid") {
      const invoiceId = typeof body.invoiceId === "string" ? body.invoiceId : "";
      const qbInvoiceId = typeof body.qbInvoiceId === "string" ? body.qbInvoiceId : "";
      const qbCustomerId = typeof body.customerId === "string" ? body.customerId : "";
      const amount = Number(body.amount);
      if (!invoiceId || !qbInvoiceId || !qbCustomerId || !Number.isFinite(amount) || amount <= 0) {
        return json({ error: "Valid invoiceId, qbInvoiceId, customerId and amount are required" }, 400);
      }

      const { data: localInvoice, error: localError } = await supabase
        .from("invoices")
        .select("id, qb_invoice_id, total, amount_paid")
        .eq("id", invoiceId)
        .eq("company_id", companyId)
        .maybeSingle();
      if (localError || !localInvoice) return json({ error: "Invoice not found" }, 404);
      if (localInvoice.qb_invoice_id && localInvoice.qb_invoice_id !== qbInvoiceId) {
        return json({ error: "QuickBooks invoice identity mismatch" }, 409);
      }

      const response = await fetch(`${QUICKBOOKS_BASE_URL}/${realmId}/payment?minorversion=65`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          CustomerRef: { value: qbCustomerId },
          TotalAmt: amount,
          Line: [{ Amount: amount, LinkedTxn: [{ TxnId: qbInvoiceId, TxnType: "Invoice" }] }],
        }),
      });
      if (!response.ok) throw new Error(`QuickBooks payment error (${response.status})`);

      const total = Number(localInvoice.total || 0);
      const newPaidAmount = Number(localInvoice.amount_paid || 0) + amount;
      const status = newPaidAmount >= total ? "paid" : "partial";
      const { error } = await supabase
        .from("invoices")
        .update({
          status,
          amount_paid: newPaidAmount,
          qb_balance: Math.max(0, total - newPaidAmount),
          qb_synced_at: new Date().toISOString(),
        })
        .eq("id", invoiceId)
        .eq("company_id", companyId);
      if (error) throw error;

      return json({ success: true, message: "Payment recorded", status, amount_paid: newPaidAmount });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (error: unknown) {
    console.error("QuickBooks sync error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
