import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { authorizeStaffRequest } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RC_API_BASE = "https://platform.ringcentral.com/restapi/v1.0";
const RC_TOKEN_URL = "https://platform.ringcentral.com/restapi/oauth/token";
const RC_CLIENT_ID = Deno.env.get("RINGCENTRAL_CLIENT_ID");
const RC_CLIENT_SECRET = Deno.env.get("RINGCENTRAL_CLIENT_SECRET");
type SupabaseClient = ReturnType<typeof createClient>;

async function refreshToken(supabase: SupabaseClient, connection: {
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

async function getValidToken(supabase: SupabaseClient, connection: {
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

// Max file size for MMS (RingCentral limit is ~1.5MB, we use 1MB to be safe)
const MAX_MMS_SIZE = 1 * 1024 * 1024; // 1MB

function isAllowedAttachmentUrl(value: string, supabaseUrl: string): boolean {
  try {
    const candidate = new URL(value);
    const storageOrigin = new URL(supabaseUrl).origin;
    return candidate.protocol === "https:"
      && candidate.origin === storageOrigin
      && [
        "/storage/v1/object/public/message-attachments/",
        "/storage/v1/object/public/broadcast-attachments/",
      ].some((prefix) => candidate.pathname.startsWith(prefix));
  } catch {
    return false;
  }
}

async function getFileSize(url: string): Promise<number> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    const contentLength = response.headers.get("content-length");
    return contentLength ? parseInt(contentLength, 10) : 0;
  } catch {
    return 0;
  }
}

async function downloadFileAsBase64(url: string): Promise<{ base64: string; contentType: string; size: number }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  
  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const size = uint8Array.length;
  
  // Convert to base64 without spread operator to avoid stack overflow on large files
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  const base64 = btoa(binary);
  
  return { base64, contentType, size };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authError = await authorizeStaffRequest(
      req,
      supabase,
      ["admin", "cleaning_manager", "office_manager", "virtual_assistant"],
      { allowServiceRole: true },
    );
    if (authError) return authError;

    const { company_id, to_phone, message, attachment_url } = await req.json();

    if (!company_id || !to_phone) {
      return new Response(
        JSON.stringify({ error: "company_id and to_phone are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (attachment_url && (typeof attachment_url !== "string" || !isAllowedAttachmentUrl(attachment_url, supabaseUrl))) {
      return new Response(
        JSON.stringify({ error: "Invalid attachment URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get RingCentral connection
    const { data: connection, error: connError } = await supabase
      .from("ringcentral_connections")
      .select("*")
      .eq("company_id", company_id)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "RingCentral not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get valid access token
    const accessToken = await getValidToken(supabase, connection);

    // Normalize phone number
    let formattedPhone = to_phone.replace(/\D/g, "");
    if (formattedPhone.length === 10) {
      formattedPhone = "+1" + formattedPhone;
    } else if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+" + formattedPhone;
    }

    // Get the from phone number from connection
    const fromNumber = connection.phone_number || Deno.env.get("RINGCENTRAL_FROM_NUMBER");
    
    if (!fromNumber) {
      return new Response(
        JSON.stringify({ error: "No from phone number configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sendResponse;
    let messageType = "SMS";

    if (attachment_url) {
      // Check file size first
      const fileSize = await getFileSize(attachment_url);
      if (fileSize > MAX_MMS_SIZE || fileSize === 0) {
        // File too large for MMS - send as SMS with link
        // Extract filename from URL for friendly display
        let fileName = "Document";
        try {
          const urlPath = new URL(attachment_url).pathname;
          const pathParts = urlPath.split("/");
          const rawName = pathParts[pathParts.length - 1];
          // Remove timestamp prefix if present
          fileName = decodeURIComponent(rawName).replace(/^\d{13,}_/, '') || "Document";
        } catch {
          // Keep default
        }
        
        const textWithLink = message 
          ? `${message}\n\n📎 ${fileName}: ${attachment_url}`
          : `📎 ${fileName}: ${attachment_url}`;

        sendResponse = await fetch(`${RC_API_BASE}/account/~/extension/~/sms`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: { phoneNumber: fromNumber },
            to: [{ phoneNumber: formattedPhone }],
            text: textWithLink,
          }),
        });
        messageType = "SMS_WITH_LINK";
      } else {
        // File small enough - send as MMS
        const { base64, contentType } = await downloadFileAsBase64(attachment_url);
        
        const boundary = "----RingCentralBoundary" + Date.now();
        
        const jsonPart = JSON.stringify({
          from: { phoneNumber: fromNumber },
          to: [{ phoneNumber: formattedPhone }],
          text: message || "",
        });

        let body = "";
        body += `--${boundary}\r\n`;
        body += `Content-Type: application/json\r\n\r\n`;
        body += jsonPart + "\r\n";
        body += `--${boundary}\r\n`;
        body += `Content-Type: ${contentType}\r\n`;
        body += `Content-Transfer-Encoding: base64\r\n\r\n`;
        body += base64 + "\r\n";
        body += `--${boundary}--\r\n`;

        sendResponse = await fetch(`${RC_API_BASE}/account/~/extension/~/sms`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": `multipart/mixed; boundary=${boundary}`,
          },
          body: body,
        });
        messageType = "MMS";
      }
    } else {
      // Send regular SMS
      sendResponse = await fetch(`${RC_API_BASE}/account/~/extension/~/sms`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: { phoneNumber: fromNumber },
          to: [{ phoneNumber: formattedPhone }],
          text: message || "",
        }),
      });
    }

    if (!sendResponse.ok) {
      await sendResponse.body?.cancel();
      console.error("Failed to send RingCentral message:", sendResponse.status);
      return new Response(
        JSON.stringify({ error: "Failed to send message via RingCentral" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await sendResponse.json();
    return new Response(
      JSON.stringify({
        success: true,
        message_id: result.id,
        type: messageType,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send message error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
