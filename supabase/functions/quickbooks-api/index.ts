import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QUICKBOOKS_BASE_URL = "https://quickbooks.api.intuit.com/v3/company";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, accessToken, realmId, data } = body;

    // Support direct parameters for customer search/create
    const customerName = body.customerName || data?.name;
    const customerEmail = body.email || data?.email;

    if (!accessToken || !realmId) {
      throw new Error("Missing accessToken or realmId");
    }

    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    // ==================== CUSTOMERS ====================
    
    // Search customer by name
    if (action === "search-customer") {
      const searchName = customerName;
      if (!searchName) {
        throw new Error("Missing customerName for search");
      }
      
      const query = encodeURIComponent(`SELECT * FROM Customer WHERE DisplayName = '${searchName}'`);
      const response = await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/query?query=${query}&minorversion=65`,
        { headers }
      );
      const result = await response.json();
      
      // Return first matching customer
      const customer = result.QueryResponse?.Customer?.[0] || null;
      return new Response(JSON.stringify({ customer, found: !!customer }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get-customers") {
      const response = await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/query?query=SELECT * FROM Customer&minorversion=65`,
        { headers }
      );
      const result = await response.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create-customer") {
      const name = body.name || data?.name;
      const email = body.email || data?.email;
      const phone = data?.phone;
      
      const response = await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/customer?minorversion=65`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            DisplayName: name,
            PrimaryEmailAddr: email ? { Address: email } : undefined,
            PrimaryPhone: phone ? { FreeFormNumber: phone } : undefined,
            BillAddr: data?.address ? {
              Line1: data.address,
              City: data.city,
              CountrySubDivisionCode: data.state,
              PostalCode: data.zip,
            } : undefined,
          }),
        }
      );
      const result = await response.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== INVOICES ====================
    if (action === "get-invoices") {
      const response = await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/query?query=SELECT * FROM Invoice&minorversion=65`,
        { headers }
      );
      const result = await response.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get-invoice") {
      const response = await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/invoice/${data.invoiceId}?minorversion=65`,
        { headers }
      );
      const result = await response.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create-invoice") {
      const invoiceData = {
        CustomerRef: { value: data.customerId },
        Line: data.lineItems.map((item: any) => ({
          Amount: item.amount,
          DetailType: "SalesItemLineDetail",
          SalesItemLineDetail: {
            ItemRef: item.itemId ? { value: item.itemId } : undefined,
            Qty: item.quantity || 1,
            UnitPrice: item.unitPrice || item.amount,
          },
          Description: item.description,
        })),
        DueDate: data.dueDate,
        DocNumber: data.invoiceNumber,
        CustomerMemo: data.notes ? { value: data.notes } : undefined,
        BillEmail: data.email ? { Address: data.email } : undefined,
      };

      const response = await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/invoice?minorversion=65`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(invoiceData),
        }
      );
      const result = await response.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send-invoice") {
      const response = await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/invoice/${data.invoiceId}/send?sendTo=${encodeURIComponent(data.email)}&minorversion=65`,
        {
          method: "POST",
          headers,
        }
      );
      const result = await response.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "void-invoice") {
      // First get the invoice to get SyncToken
      const getResponse = await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/invoice/${data.invoiceId}?minorversion=65`,
        { headers }
      );
      const invoice = await getResponse.json();
      
      const response = await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/invoice?operation=void&minorversion=65`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            Id: data.invoiceId,
            SyncToken: invoice.Invoice.SyncToken,
          }),
        }
      );
      const result = await response.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== PAYMENTS ====================
    if (action === "get-payments") {
      const response = await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/query?query=SELECT * FROM Payment&minorversion=65`,
        { headers }
      );
      const result = await response.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create-payment") {
      const paymentData = {
        CustomerRef: { value: data.customerId },
        TotalAmt: data.amount,
        Line: data.invoiceId ? [{
          Amount: data.amount,
          LinkedTxn: [{
            TxnId: data.invoiceId,
            TxnType: "Invoice"
          }]
        }] : undefined,
      };

      const response = await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/payment?minorversion=65`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(paymentData),
        }
      );
      const result = await response.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== EMPLOYEES & PAYROLL ====================
    if (action === "get-employees") {
      const response = await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/query?query=SELECT * FROM Employee&minorversion=65`,
        { headers }
      );
      const result = await response.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create-employee") {
      const response = await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/employee?minorversion=65`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            GivenName: data.firstName,
            FamilyName: data.lastName,
            DisplayName: `${data.firstName} ${data.lastName}`,
            PrimaryEmailAddr: data.email ? { Address: data.email } : undefined,
            PrimaryPhone: data.phone ? { FreeFormNumber: data.phone } : undefined,
          }),
        }
      );
      const result = await response.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bill for contractor payments (simplified payroll)
    if (action === "create-bill") {
      const billData = {
        VendorRef: { value: data.vendorId },
        Line: [{
          Amount: data.amount,
          DetailType: "AccountBasedExpenseLineDetail",
          AccountBasedExpenseLineDetail: {
            AccountRef: { value: data.accountId || "1" },
          },
          Description: data.description || "Payroll payment",
        }],
        DueDate: data.dueDate,
      };

      const response = await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/bill?minorversion=65`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(billData),
        }
      );
      const result = await response.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== VENDORS (for contractors) ====================
    if (action === "get-vendors") {
      const response = await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/query?query=SELECT * FROM Vendor&minorversion=65`,
        { headers }
      );
      const result = await response.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create-vendor") {
      const response = await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/vendor?minorversion=65`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            DisplayName: data.name,
            PrimaryEmailAddr: data.email ? { Address: data.email } : undefined,
            PrimaryPhone: data.phone ? { FreeFormNumber: data.phone } : undefined,
          }),
        }
      );
      const result = await response.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== COMPANY INFO ====================
    if (action === "get-company-info") {
      const response = await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/companyinfo/${realmId}?minorversion=65`,
        { headers }
      );
      const result = await response.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("QuickBooks API Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
