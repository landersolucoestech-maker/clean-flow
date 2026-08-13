import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { getAuthorizedStaffIdentity } from "../_shared/authorize.ts";
import { getQuickBooksConnection, quickBooksHeaders } from "../_shared/quickbooks.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QUICKBOOKS_BASE_URL = "https://quickbooks.api.intuit.com/v3/company";
const PAYMENT_TERMS_DAYS: Record<string, number> = {
  due_on_receipt: 0,
  net_7: 7,
  net_15: 15,
  net_30: 30,
  net_45: 45,
  net_60: 60,
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { jobId, qbCustomerId } = await req.json();
    if (typeof jobId !== "string" || !jobId) return json({ error: "jobId is required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authorization = await getAuthorizedStaffIdentity(req, supabase, ["admin", "office_manager"]);
    if (authorization.error) return authorization.error;
    const companyId = authorization.identity.companyId;

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select(`
        *,
        customer:customers(id, name, email, payment_terms)
      `)
      .eq("id", jobId)
      .eq("company_id", companyId)
      .single();

    if (jobError || !job) return json({ error: "Job not found" }, 404);

    const { data: existingInvoice } = await supabase
      .from("invoices")
      .select("*")
      .eq("company_id", companyId)
      .eq("job_id", jobId)
      .eq("auto_generated", true)
      .maybeSingle();

    if (existingInvoice) {
      return json({
        success: true,
        idempotent: true,
        invoice: existingInvoice,
        invoiceId: existingInvoice.id,
        message: "Invoice already exists for this job",
      });
    }

    const { data: nextNumber, error: numberError } = await supabase.rpc("next_invoice_number");
    if (numberError || typeof nextNumber !== "string") throw numberError || new Error("Unable to allocate invoice number");

    const now = new Date();
    const issueDate = now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    const paymentTerms = job.customer?.payment_terms || "due_on_receipt";
    const daysToAdd = PAYMENT_TERMS_DAYS[paymentTerms] || 0;
    const due = new Date(`${issueDate}T12:00:00Z`);
    due.setUTCDate(due.getUTCDate() + daysToAdd);
    const dueDate = due.toISOString().split("T")[0];

    const subtotal = Number(job.amount || 0);
    const taxRate = 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    const invoiceNotes = job.description || job.notes || `Service: ${job.title}`;

    // Persist the local source of truth first. The database trigger creates the
    // linked financial transaction in the same PostgreSQL transaction.
    const { data: newInvoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        company_id: companyId,
        invoice_number: nextNumber,
        customer_id: job.customer_id,
        job_id: jobId,
        status: "sent",
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        amount_paid: 0,
        issue_date: issueDate,
        due_date: dueDate,
        notes: invoiceNotes,
        auto_generated: true,
      })
      .select()
      .single();

    if (invoiceError || !newInvoice) {
      // A concurrent request may have won the unique (company_id, job_id)
      // invariant. Return that record as an idempotent success.
      const { data: concurrentInvoice } = await supabase
        .from("invoices")
        .select("*")
        .eq("company_id", companyId)
        .eq("job_id", jobId)
        .eq("auto_generated", true)
        .maybeSingle();
      if (concurrentInvoice) {
        return json({
          success: true,
          idempotent: true,
          invoice: concurrentInvoice,
          invoiceId: concurrentInvoice.id,
          message: "Invoice already created by a concurrent request",
        });
      }
      throw invoiceError || new Error("Unable to create invoice");
    }

    await supabase
      .from("jobs")
      .update({ invoice_status: "Generated" })
      .eq("id", jobId)
      .eq("company_id", companyId);

    let qbInvoiceId: string | null = null;
    let qbDocNumber: string | null = null;
    let actualQbCustomerId = typeof qbCustomerId === "string" ? qbCustomerId : null;

    try {
      const connection = await getQuickBooksConnection(supabase, companyId);
      const realmId = connection.realm_id;
      const headers = quickBooksHeaders(connection.access_token);

      if (!actualQbCustomerId && job.customer) {
        const escapedCustomerName = String(job.customer.name).replace(/'/g, "''");
        const query = encodeURIComponent(`SELECT * FROM Customer WHERE DisplayName = '${escapedCustomerName}'`);
        const searchResponse = await fetch(
          `${QUICKBOOKS_BASE_URL}/${realmId}/query?query=${query}&minorversion=65`,
          { method: "GET", headers },
        );
        if (searchResponse.ok) {
          const searchResult = await searchResponse.json();
          actualQbCustomerId = searchResult.QueryResponse?.Customer?.[0]?.Id || null;
        }

        if (!actualQbCustomerId) {
          const customerResponse = await fetch(
            `${QUICKBOOKS_BASE_URL}/${realmId}/customer?minorversion=65`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({
                DisplayName: job.customer.name,
                PrimaryEmailAddr: job.customer.email ? { Address: job.customer.email } : undefined,
              }),
            },
          );
          if (customerResponse.ok) {
            const createdCustomer = await customerResponse.json();
            actualQbCustomerId = createdCustomer.Customer?.Id || null;
          }
        }
      }

      if (actualQbCustomerId) {
        const lineItemDescription = job.description || job.notes || job.title || "Service";
        const qbResponse = await fetch(
          `${QUICKBOOKS_BASE_URL}/${realmId}/invoice?minorversion=65`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              CustomerRef: { value: actualQbCustomerId },
              Line: [{
                Amount: subtotal,
                DetailType: "SalesItemLineDetail",
                SalesItemLineDetail: { Qty: 1, UnitPrice: subtotal },
                Description: lineItemDescription,
              }],
              DueDate: dueDate,
              DocNumber: nextNumber,
              BillEmail: job.customer?.email ? { Address: job.customer.email } : undefined,
            }),
          },
        );

        if (!qbResponse.ok) throw new Error(`QuickBooks invoice creation failed (${qbResponse.status})`);
        const result = await qbResponse.json();
        qbInvoiceId = result.Invoice?.Id || null;
        qbDocNumber = result.Invoice?.DocNumber || null;

        if (qbInvoiceId && job.customer?.email) {
          const sendResponse = await fetch(
            `${QUICKBOOKS_BASE_URL}/${realmId}/invoice/${qbInvoiceId}/send?sendTo=${encodeURIComponent(job.customer.email)}&minorversion=65`,
            { method: "POST", headers },
          );
          if (!sendResponse.ok) console.error("QuickBooks invoice created but email send failed", sendResponse.status);
        }

        const { error: syncError } = await supabase
          .from("invoices")
          .update({
            qb_invoice_id: qbInvoiceId,
            qb_doc_number: qbDocNumber,
            qb_email_status: qbInvoiceId ? "EmailSent" : null,
            qb_synced_at: qbInvoiceId ? new Date().toISOString() : null,
          })
          .eq("id", newInvoice.id)
          .eq("company_id", companyId);
        if (syncError) console.error("QuickBooks invoice created but local sync metadata update failed", syncError);
      }
    } catch (quickBooksError) {
      console.error("Invoice created locally; QuickBooks synchronization pending", quickBooksError);
    }

    return json({
      success: true,
      invoice: newInvoice,
      qbInvoiceId,
      message: qbInvoiceId
        ? "Invoice created locally and synchronized with QuickBooks"
        : "Invoice created locally; QuickBooks synchronization pending or not configured",
    });
  } catch (error: unknown) {
    console.error("Auto Generate Invoice Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
