import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RC_API_BASE = "https://platform.ringcentral.com/restapi/v1.0";
const RC_TOKEN_URL = "https://platform.ringcentral.com/restapi/oauth/token";
const RC_CLIENT_ID = Deno.env.get("RINGCENTRAL_CLIENT_ID");
const RC_CLIENT_SECRET = Deno.env.get("RINGCENTRAL_CLIENT_SECRET");

async function refreshToken(supabase: any, connection: {
  company_id: string;
  refresh_token: string;
}) {
  const response = await fetch(RC_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${RC_CLIENT_ID}:${RC_CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  const tokenData = await response.json();
  const tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  await supabase
    .from("ringcentral_connections")
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: tokenExpiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", connection.company_id);

  return tokenData.access_token;
}

async function getValidToken(supabase: any, connection: {
  company_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
}) {
  const expiresAt = new Date(connection.token_expires_at);
  const now = new Date();
  
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    return await refreshToken(supabase, connection);
  }
  
  return connection.access_token;
}

// Get payment info for SMS
function getPaymentInfoSMS(
  paymentMethod: string | null,
  zelleKey: string | null,
  venmoKey: string | null
): string {
  if (!paymentMethod) return "";
  
  const method = paymentMethod.toLowerCase();
  
  if (method === "zelle" && zelleKey) {
    return `Pay via Zelle: ${zelleKey}`;
  }
  
  if (method === "venmo" && venmoKey) {
    return `Pay via Venmo: ${venmoKey}`;
  }
  
  return "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, invoice_id } = await req.json();

    // Get company settings
    const { data: companySettings } = await supabase
      .from("company_settings")
      .select("id, zelle_payment_key, venmo_payment_key, trade_name, preferred_language")
      .maybeSingle();

    if (!companySettings) {
      return new Response(
        JSON.stringify({ error: "Company settings not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const zelleKey = companySettings.zelle_payment_key;
    const venmoKey = companySettings.venmo_payment_key;
    const companyName = companySettings.trade_name || "Our Company";

    // Get RingCentral connection
    const { data: connection, error: connError } = await supabase
      .from("ringcentral_connections")
      .select("*")
      .eq("company_id", companySettings.id)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "RingCentral not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = await getValidToken(supabase, connection);
    const fromNumber = connection.phone_number || Deno.env.get("RINGCENTRAL_FROM_NUMBER");

    if (!fromNumber) {
      return new Response(
        JSON.stringify({ error: "No from phone number configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send reminder for single invoice
    if (action === "send-single" && invoice_id) {
      const { data: invoice } = await supabase
        .from("invoices")
        .select(`
          id, invoice_number, total, due_date, status,
          customer:customers(name, phone, phone2, payment_method, preferred_language)
        `)
        .eq("id", invoice_id)
        .single();

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      const customer = invoice.customer as any;
      const phone = customer?.phone || customer?.phone2;
      
      if (!phone) {
        throw new Error("Customer has no phone number");
      }

      const paymentInfo = getPaymentInfoSMS(customer.payment_method, zelleKey, venmoKey);
      const isOverdue = invoice.status === "overdue" || new Date(invoice.due_date) < new Date();

      let message = isOverdue
        ? `Hi ${customer.name}, invoice ${invoice.invoice_number} for $${invoice.total?.toFixed(2)} is overdue. ${paymentInfo}Please pay ASAP. - ${companyName}`
        : `Hi ${customer.name}, reminder: invoice ${invoice.invoice_number} for $${invoice.total?.toFixed(2)} is due on ${invoice.due_date}. ${paymentInfo}- ${companyName}`;

      // Normalize phone
      let formattedPhone = phone.replace(/\D/g, "");
      if (formattedPhone.length === 10) {
        formattedPhone = "+1" + formattedPhone;
      } else if (!formattedPhone.startsWith("+")) {
        formattedPhone = "+" + formattedPhone;
      }

      const sendResponse = await fetch(`${RC_API_BASE}/account/~/extension/~/sms`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: { phoneNumber: fromNumber },
          to: [{ phoneNumber: formattedPhone }],
          text: message,
        }),
      });

      if (!sendResponse.ok) {
        const errorText = await sendResponse.text();
        console.error("Failed to send SMS:", errorText);
        throw new Error("Failed to send SMS");
      }

      // Log the automation
      await supabase.from("automation_logs").insert({
        trigger_type: isOverdue ? "invoice_overdue_sms" : "invoice_reminder_sms",
        invoice_id: invoice.id,
        customer_id: customer.id,
        message_sent: message,
        sent_to: formattedPhone,
        sent_via: "sms",
        status: "sent",
      });

      return new Response(
        JSON.stringify({ success: true, message: "SMS sent successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Batch send reminders for all upcoming/overdue invoices
    if (action === "send-batch") {
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      // Fetch invoices needing reminders
      const { data: invoices } = await supabase
        .from("invoices")
        .select(`
          id, invoice_number, total, due_date, status, reminder_sent_at,
          customer:customers(id, name, phone, phone2, payment_method, preferred_language)
        `)
        .in("status", ["sent", "viewed", "overdue"])
        .lte("due_date", threeDaysFromNow.toISOString().split("T")[0]);

      let sentCount = 0;
      const errors: string[] = [];

      for (const invoice of (invoices || [])) {
        const customer = invoice.customer as any;
        const phone = customer?.phone || customer?.phone2;
        
        if (!phone) continue;

        try {
          const paymentInfo = getPaymentInfoSMS(customer.payment_method, zelleKey, venmoKey);
          const isOverdue = new Date(invoice.due_date) < now;

          const message = isOverdue
            ? `Hi ${customer.name}, invoice ${invoice.invoice_number} for $${invoice.total?.toFixed(2)} is overdue. ${paymentInfo}Please pay ASAP. - ${companyName}`
            : `Hi ${customer.name}, reminder: invoice ${invoice.invoice_number} for $${invoice.total?.toFixed(2)} is due soon. ${paymentInfo}- ${companyName}`;

          let formattedPhone = phone.replace(/\D/g, "");
          if (formattedPhone.length === 10) {
            formattedPhone = "+1" + formattedPhone;
          } else if (!formattedPhone.startsWith("+")) {
            formattedPhone = "+" + formattedPhone;
          }

          const sendResponse = await fetch(`${RC_API_BASE}/account/~/extension/~/sms`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: { phoneNumber: fromNumber },
              to: [{ phoneNumber: formattedPhone }],
              text: message,
            }),
          });

          if (sendResponse.ok) {
            await supabase.from("automation_logs").insert({
              trigger_type: isOverdue ? "invoice_overdue_sms" : "invoice_reminder_sms",
              invoice_id: invoice.id,
              customer_id: customer.id,
              message_sent: message,
              sent_to: formattedPhone,
              sent_via: "sms",
              status: "sent",
            });
            sentCount++;
          } else {
            errors.push(`Failed for ${invoice.invoice_number}`);
          }
        } catch (err) {
          errors.push(`Error for ${invoice.invoice_number}: ${err}`);
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

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Invoice SMS Reminder Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
