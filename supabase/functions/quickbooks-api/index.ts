import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { getAuthorizedStaffIdentity } from "../_shared/authorize.ts";
import { getQuickBooksConnection, quickBooksHeaders } from "../_shared/quickbooks.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QUICKBOOKS_BASE_URL = "https://quickbooks.api.intuit.com/v3/company";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function providerJson(response: Response): Promise<unknown> {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`QuickBooks API error (${response.status})`);
  return result;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Backend not configured" }, 503);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const authorization = await getAuthorizedStaffIdentity(req, adminClient, ["admin", "office_manager"]);
    if (authorization.error) return authorization.error;
    const companyId = authorization.identity.companyId;

    const body = await req.json();
    const { action, data } = body;
    const connection = await getQuickBooksConnection(adminClient, companyId);
    const realmId = connection.realm_id;
    const headers = quickBooksHeaders(connection.access_token);
    const customerName = body.customerName || data?.name || data?.displayName;

    if (action === "search-customer") {
      if (!customerName) return json({ error: "customerName is required" }, 400);
      const escapedName = String(customerName).replace(/'/g, "''");
      const query = encodeURIComponent(`SELECT * FROM Customer WHERE DisplayName = '${escapedName}'`);
      const result = await providerJson(await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/query?query=${query}&minorversion=65`,
        { headers },
      )) as { QueryResponse?: { Customer?: unknown[] } };
      const customer = result.QueryResponse?.Customer?.[0] || null;
      return json({ customer, found: !!customer });
    }

    if (action === "get-customers") {
      return json(await providerJson(await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/query?query=SELECT * FROM Customer&minorversion=65`, { headers },
      )));
    }

    if (action === "create-customer") {
      const name = body.name || data?.name;
      if (!name) return json({ error: "Customer name is required" }, 400);
      const result = await providerJson(await fetch(`${QUICKBOOKS_BASE_URL}/${realmId}/customer?minorversion=65`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          DisplayName: name,
          PrimaryEmailAddr: (body.email || data?.email) ? { Address: body.email || data?.email } : undefined,
          PrimaryPhone: data?.phone ? { FreeFormNumber: data.phone } : undefined,
          BillAddr: data?.address ? {
            Line1: data.address,
            City: data.city,
            CountrySubDivisionCode: data.state,
            PostalCode: data.zip,
          } : undefined,
        }),
      }));
      return json(result);
    }

    if (action === "get-invoices") {
      return json(await providerJson(await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/query?query=SELECT * FROM Invoice&minorversion=65`, { headers },
      )));
    }

    if (action === "get-invoice") {
      if (!data?.invoiceId) return json({ error: "invoiceId is required" }, 400);
      return json(await providerJson(await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/invoice/${encodeURIComponent(data.invoiceId)}?minorversion=65`, { headers },
      )));
    }

    if (action === "create-invoice") {
      if (!data?.customerId || !Array.isArray(data?.lineItems) || data.lineItems.length === 0) {
        return json({ error: "customerId and lineItems are required" }, 400);
      }
      const invoiceData = {
        CustomerRef: { value: data.customerId },
        Line: data.lineItems.map((item: { amount: number; itemId?: string; quantity?: number; unitPrice?: number; description?: string }) => ({
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
      return json(await providerJson(await fetch(`${QUICKBOOKS_BASE_URL}/${realmId}/invoice?minorversion=65`, {
        method: "POST", headers, body: JSON.stringify(invoiceData),
      })));
    }

    if (action === "send-invoice") {
      if (!data?.invoiceId || !data?.email) return json({ error: "invoiceId and email are required" }, 400);
      return json(await providerJson(await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/invoice/${encodeURIComponent(data.invoiceId)}/send?sendTo=${encodeURIComponent(data.email)}&minorversion=65`,
        { method: "POST", headers },
      )));
    }

    if (action === "void-invoice") {
      if (!data?.invoiceId) return json({ error: "invoiceId is required" }, 400);
      const invoiceResult = await providerJson(await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/invoice/${encodeURIComponent(data.invoiceId)}?minorversion=65`, { headers },
      )) as { Invoice?: { SyncToken?: string } };
      if (!invoiceResult.Invoice?.SyncToken) return json({ error: "Unable to resolve invoice SyncToken" }, 409);
      return json(await providerJson(await fetch(`${QUICKBOOKS_BASE_URL}/${realmId}/invoice?operation=void&minorversion=65`, {
        method: "POST",
        headers,
        body: JSON.stringify({ Id: data.invoiceId, SyncToken: invoiceResult.Invoice.SyncToken }),
      })));
    }

    if (action === "get-payments") {
      return json(await providerJson(await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/query?query=SELECT * FROM Payment&minorversion=65`, { headers },
      )));
    }

    if (action === "create-payment") {
      const amount = Number(data?.amount);
      if (!data?.customerId || !Number.isFinite(amount) || amount <= 0) {
        return json({ error: "Valid customerId and amount are required" }, 400);
      }
      return json(await providerJson(await fetch(`${QUICKBOOKS_BASE_URL}/${realmId}/payment?minorversion=65`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          CustomerRef: { value: data.customerId },
          TotalAmt: amount,
          Line: data.invoiceId ? [{ Amount: amount, LinkedTxn: [{ TxnId: data.invoiceId, TxnType: "Invoice" }] }] : undefined,
        }),
      })));
    }

    if (action === "get-employees") {
      return json(await providerJson(await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/query?query=SELECT * FROM Employee&minorversion=65`, { headers },
      )));
    }

    if (action === "create-employee") {
      if (!data?.firstName || !data?.lastName) return json({ error: "firstName and lastName are required" }, 400);
      return json(await providerJson(await fetch(`${QUICKBOOKS_BASE_URL}/${realmId}/employee?minorversion=65`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          GivenName: data.firstName,
          FamilyName: data.lastName,
          DisplayName: `${data.firstName} ${data.lastName}`,
          PrimaryEmailAddr: data.email ? { Address: data.email } : undefined,
          PrimaryPhone: data.phone ? { FreeFormNumber: data.phone } : undefined,
        }),
      })));
    }

    if (action === "create-bill") {
      const amount = Number(data?.amount);
      if (!data?.vendorId || !Number.isFinite(amount) || amount <= 0) {
        return json({ error: "Valid vendorId and amount are required" }, 400);
      }
      return json(await providerJson(await fetch(`${QUICKBOOKS_BASE_URL}/${realmId}/bill?minorversion=65`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          VendorRef: { value: data.vendorId },
          Line: [{
            Amount: amount,
            DetailType: "AccountBasedExpenseLineDetail",
            AccountBasedExpenseLineDetail: { AccountRef: { value: data.accountId || "1" } },
            Description: data.description || "Payroll payment",
          }],
          DueDate: data.dueDate,
        }),
      })));
    }

    if (action === "get-vendors") {
      return json(await providerJson(await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/query?query=SELECT * FROM Vendor&minorversion=65`, { headers },
      )));
    }

    if (action === "create-vendor") {
      if (!data?.name) return json({ error: "Vendor name is required" }, 400);
      return json(await providerJson(await fetch(`${QUICKBOOKS_BASE_URL}/${realmId}/vendor?minorversion=65`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          DisplayName: data.name,
          PrimaryEmailAddr: data.email ? { Address: data.email } : undefined,
          PrimaryPhone: data.phone ? { FreeFormNumber: data.phone } : undefined,
        }),
      })));
    }

    if (action === "get-company-info") {
      return json(await providerJson(await fetch(
        `${QUICKBOOKS_BASE_URL}/${realmId}/companyinfo/${realmId}?minorversion=65`, { headers },
      )));
    }

    return json({ error: "Invalid action" }, 400);
  } catch (error: unknown) {
    console.error("QuickBooks API error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
