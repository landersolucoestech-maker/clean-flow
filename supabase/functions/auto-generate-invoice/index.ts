import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { authorizeStaffRequest } from "../_shared/authorize.ts";
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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId, qbCustomerId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authorizationError = await authorizeStaffRequest(
      req,
      supabase,
      ["admin", "office_manager"],
    );
    if (authorizationError) return authorizationError;

    // Fetch job with customer info
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select(`
        *,
        customer:customers(id, name, email, payment_terms)
      `)
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      throw new Error("Job not found");
    }

    // Check if invoice already exists for this job
    const { data: existingInvoice } = await supabase
      .from("invoices")
      .select("id")
      .eq("job_id", jobId)
      .single();

    if (existingInvoice) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Invoice already exists for this job",
          invoiceId: existingInvoice.id
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate invoice number
    const { data: lastInvoice } = await supabase
      .from("invoices")
      .select("invoice_number")
      .order("created_at", { ascending: false })
      .limit(1);

    let nextNumber = "INV-000001";
    if (lastInvoice && lastInvoice.length > 0) {
      const match = lastInvoice[0].invoice_number.match(/(\d+)$/);
      if (match) {
        const nextNum = parseInt(match[1], 10) + 1;
        nextNumber = `INV-${String(nextNum).padStart(6, "0")}`;
      }
    }

    // Calculate dates using EST timezone
    const getESTDate = () => {
      const now = new Date();
      // Convert to EST (America/New_York)
      const estString = now.toLocaleString("en-US", { timeZone: "America/New_York" });
      return new Date(estString);
    };
    
    const issueDate = getESTDate();
    const paymentTerms = job.customer?.payment_terms || "due_on_receipt";
    const daysToAdd = PAYMENT_TERMS_DAYS[paymentTerms] || 0;
    const dueDate = new Date(issueDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    const subtotal = job.amount || 0;
    const taxRate = 0; // Default tax rate, can be customized
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    // Create invoice in QuickBooks if connected
    let qbInvoiceId: string | null = null;
    let qbDocNumber: string | null = null;
    let actualQbCustomerId = qbCustomerId;

    const quickBooksConnection = await getQuickBooksConnection(supabase).catch(() => null);
    if (quickBooksConnection) {
      const realmId = quickBooksConnection.realm_id;
      const headers = quickBooksHeaders(quickBooksConnection.access_token);

      // Auto-map customer to QuickBooks if not provided
      if (!actualQbCustomerId && job.customer) {
        // Search for existing customer in QuickBooks by name
        const escapedCustomerName = String(job.customer.name).replace(/'/g, "''");
        const searchQuery = encodeURIComponent(`SELECT * FROM Customer WHERE DisplayName = '${escapedCustomerName}'`);
        const searchResponse = await fetch(
          `${QUICKBOOKS_BASE_URL}/${realmId}/query?query=${searchQuery}&minorversion=65`,
          { method: "GET", headers }
        );

        if (searchResponse.ok) {
          const searchResult = await searchResponse.json();
          if (searchResult.QueryResponse?.Customer?.length > 0) {
            actualQbCustomerId = searchResult.QueryResponse.Customer[0].Id;
          } else {
            // Create customer in QuickBooks
            const customerData = {
              DisplayName: job.customer.name,
              PrimaryEmailAddr: job.customer.email ? { Address: job.customer.email } : undefined,
            };

            const createCustomerResponse = await fetch(
              `${QUICKBOOKS_BASE_URL}/${realmId}/customer?minorversion=65`,
              {
                method: "POST",
                headers,
                body: JSON.stringify(customerData),
              }
            );

            if (createCustomerResponse.ok) {
              const newCustomer = await createCustomerResponse.json();
              actualQbCustomerId = newCustomer.Customer?.Id;
            }
          }
        }
      }

      // Create invoice in QuickBooks
      if (actualQbCustomerId) {
        // Use job description, fallback to notes, then title
        const lineItemDescription = job.description || job.notes || job.title || "Service";
        
        const invoiceData = {
          CustomerRef: { value: actualQbCustomerId },
          Line: [{
            Amount: subtotal,
            DetailType: "SalesItemLineDetail",
            SalesItemLineDetail: {
              Qty: 1,
              UnitPrice: subtotal,
            },
            Description: lineItemDescription,
          }],
          DueDate: dueDate.toISOString().split("T")[0],
          DocNumber: nextNumber,
          BillEmail: job.customer?.email ? { Address: job.customer.email } : undefined,
        };

        const response = await fetch(
          `${QUICKBOOKS_BASE_URL}/${realmId}/invoice?minorversion=65`,
          {
            method: "POST",
            headers,
            body: JSON.stringify(invoiceData),
          }
        );

        if (response.ok) {
          const result = await response.json();
          qbInvoiceId = result.Invoice?.Id;
          qbDocNumber = result.Invoice?.DocNumber;

          // Send invoice via QuickBooks
          if (qbInvoiceId && job.customer?.email) {
            await fetch(
              `${QUICKBOOKS_BASE_URL}/${realmId}/invoice/${qbInvoiceId}/send?sendTo=${encodeURIComponent(job.customer.email)}&minorversion=65`,
              {
                method: "POST",
                headers,
              }
            );
          }
        }
      }
    }

    // Create invoice in local database - use job description
    const invoiceNotes = job.description || job.notes || `Service: ${job.title}`;
    
    const { data: newInvoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        invoice_number: nextNumber,
        customer_id: job.customer_id,
        job_id: jobId,
        status: "sent",
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        amount_paid: 0,
        issue_date: issueDate.toISOString().split("T")[0],
        due_date: dueDate.toISOString().split("T")[0],
        notes: invoiceNotes,
        qb_invoice_id: qbInvoiceId,
        qb_doc_number: qbDocNumber,
        qb_email_status: qbInvoiceId ? "EmailSent" : null,
        qb_synced_at: qbInvoiceId ? new Date().toISOString() : null,
        auto_generated: true,
      })
      .select()
      .single();

    if (invoiceError) {
      throw invoiceError;
    }

    // Update job invoice status
    await supabase
      .from("jobs")
      .update({ invoice_status: "Generated" })
      .eq("id", jobId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        invoice: newInvoice,
        qbInvoiceId,
        message: qbInvoiceId 
          ? "Invoice created and sent via QuickBooks" 
          : "Invoice created locally"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Auto Generate Invoice Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
