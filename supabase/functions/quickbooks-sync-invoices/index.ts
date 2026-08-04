import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { authorizeStaffRequest } from "../_shared/authorize.ts";
import { getQuickBooksConnection, quickBooksHeaders } from "../_shared/quickbooks.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QUICKBOOKS_BASE_URL = "https://quickbooks.api.intuit.com/v3/company";

interface QuickBooksInvoice {
  Id: string;
  DocNumber: string;
  CustomerRef: { value: string; name: string };
  TotalAmt: number;
  Balance: number;
  DueDate: string;
  TxnDate: string;
  EmailStatus: string;
  // QB status: NotSent, NeedToSend, EmailSent
}

function mapQBStatusToLocal(qbInvoice: QuickBooksInvoice): string {
  const now = new Date();
  const dueDate = new Date(qbInvoice.DueDate);
  
  // If balance is 0, it's paid
  if (qbInvoice.Balance === 0) {
    return "paid";
  }
  
  // If past due date, it's overdue
  if (dueDate < now) {
    return "overdue";
  }
  
  // Based on email status
  switch (qbInvoice.EmailStatus) {
    case "EmailSent":
      return "sent";
    case "Viewed":
      return "viewed";
    default:
      return "sent";
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authorizationError = await authorizeStaffRequest(
      req,
      supabase,
      ["admin", "office_manager"],
    );
    if (authorizationError) return authorizationError;

    const connection = await getQuickBooksConnection(supabase);
    const realmId = connection.realm_id;
    const headers = quickBooksHeaders(connection.access_token);

    if (action === "sync-all") {
      // Fetch all invoices from QuickBooks
      const response = await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/query?query=SELECT * FROM Invoice ORDERBY MetaData.LastUpdatedTime DESC MAXRESULTS 500&minorversion=65`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`QuickBooks API error: ${response.status}`);
      }

      const result = await response.json();
      const qbInvoices = result.QueryResponse?.Invoice || [];

      let synced = 0;
      let updated = 0;

      for (const qbInvoice of qbInvoices) {
        const status = mapQBStatusToLocal(qbInvoice);
        
        // Check if we have this invoice locally
        const { data: existingInvoice } = await supabase
          .from("invoices")
          .select("id")
          .eq("qb_invoice_id", qbInvoice.Id)
          .single();

        if (existingInvoice) {
          // Update existing invoice
          await supabase
            .from("invoices")
            .update({
              status,
              qb_doc_number: qbInvoice.DocNumber,
              qb_email_status: qbInvoice.EmailStatus,
              qb_balance: qbInvoice.Balance,
              qb_synced_at: new Date().toISOString(),
            })
            .eq("id", existingInvoice.id);
          updated++;
        }
        synced++;
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          synced, 
          updated,
          message: `Synced ${synced} invoices, updated ${updated}` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "sync-single") {
      const { invoiceId, qbInvoiceId } = body;
      
      if (!invoiceId || !qbInvoiceId) {
        throw new Error("Missing required parameters");
      }

      // Fetch specific invoice from QuickBooks
      const response = await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/invoice/${qbInvoiceId}?minorversion=65`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`QuickBooks API error: ${response.status}`);
      }

      const result = await response.json();
      const qbInvoice = result.Invoice;

      const status = mapQBStatusToLocal(qbInvoice);

      // Update local invoice
      await supabase
        .from("invoices")
        .update({
          status,
          qb_doc_number: qbInvoice.DocNumber,
          qb_email_status: qbInvoice.EmailStatus,
          qb_balance: qbInvoice.Balance,
          qb_synced_at: new Date().toISOString(),
        })
        .eq("id", invoiceId);

      return new Response(
        JSON.stringify({ success: true, status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "mark-paid") {
      const { invoiceId, qbInvoiceId, amount, customerId } = body;
      
      if (!invoiceId || !qbInvoiceId || !customerId || typeof amount !== "number") {
        throw new Error("Missing required parameters");
      }

      // Create payment in QuickBooks
      const paymentData = {
        CustomerRef: { value: customerId },
        TotalAmt: amount,
        Line: [{
          Amount: amount,
          LinkedTxn: [{
            TxnId: qbInvoiceId,
            TxnType: "Invoice"
          }]
        }],
      };

      const response = await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/payment?minorversion=65`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(paymentData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`QuickBooks payment error: ${errorText}`);
      }

      // Update local invoice
      await supabase
        .from("invoices")
        .update({
          status: "paid",
          amount_paid: amount,
          qb_balance: 0,
          qb_synced_at: new Date().toISOString(),
        })
        .eq("id", invoiceId);

      return new Response(
        JSON.stringify({ success: true, message: "Payment recorded" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Sync Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
