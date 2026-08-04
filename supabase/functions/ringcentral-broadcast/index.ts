import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { authorizeStaffRequest } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BroadcastRecipient {
  id: string;
  broadcast_id: string;
  customer_id: string;
  phone: string | null;
  status: string;
}

interface RingCentralConnection {
  id: string;
  company_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  phone_number: string | null;
}

const RC_CLIENT_ID = Deno.env.get("RINGCENTRAL_CLIENT_ID");
const RC_CLIENT_SECRET = Deno.env.get("RINGCENTRAL_CLIENT_SECRET");
const RC_FROM_NUMBER = Deno.env.get("RINGCENTRAL_FROM_NUMBER");

function isAllowedAttachmentUrl(value: string, supabaseUrl: string): boolean {
  try {
    const candidate = new URL(value);
    const storageOrigin = new URL(supabaseUrl).origin;
    return candidate.protocol === "https:"
      && candidate.origin === storageOrigin
      && candidate.pathname.startsWith("/storage/v1/object/public/broadcast-attachments/");
  } catch {
    return false;
  }
}
const RC_API_BASE = "https://platform.ringcentral.com/restapi/v1.0";
const MAX_MMS_SIZE = 1 * 1024 * 1024; // 1MB - RingCentral limit is ~1.5MB

// Refresh access token if expired
async function refreshAccessToken(
  supabase: ReturnType<typeof createClient>,
  connection: RingCentralConnection
): Promise<string | null> {
  const isExpired = new Date(connection.token_expires_at) < new Date();
  
  if (!isExpired) {
    return connection.access_token;
  }

  if (!RC_CLIENT_ID || !RC_CLIENT_SECRET) {
    console.error("RingCentral client credentials not configured");
    return null;
  }

  try {
    const tokenResponse = await fetch(
      "https://platform.ringcentral.com/restapi/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${RC_CLIENT_ID}:${RC_CLIENT_SECRET}`)}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: connection.refresh_token,
        }),
      }
    );

    if (!tokenResponse.ok) {
      console.error("Failed to refresh token:", await tokenResponse.text());
      return null;
    }

    const { access_token, refresh_token, expires_in } = await tokenResponse.json();
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

    // Update tokens in database
    await supabase
      .from("ringcentral_connections")
      .update({
        access_token,
        refresh_token,
        token_expires_at: tokenExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    return access_token;
  } catch (err) {
    console.error("Token refresh error:", err);
    return null;
  }
}

// Get file size without downloading
async function getFileSize(url: string): Promise<number> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    const contentLength = response.headers.get("content-length");
    return contentLength ? parseInt(contentLength, 10) : 0;
  } catch {
    return 0;
  }
}

// Download file and convert to base64
async function downloadFileAsBase64(url: string): Promise<{ base64: string; contentType: string; fileName: string; size: number } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error("Failed to download file:", response.status);
      return null;
    }
    
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const size = uint8Array.length;
    
    // Convert to base64 in chunks to avoid stack overflow
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      for (let j = 0; j < chunk.length; j++) {
        binary += String.fromCharCode(chunk[j]);
      }
    }
    const base64 = btoa(binary);
    
    // Extract filename from URL
    const urlParts = url.split("/");
    const fileName = urlParts[urlParts.length - 1] || "attachment";
    
    return { base64, contentType, fileName, size };
  } catch (err) {
    console.error("Error downloading file:", err);
    return null;
  }
}

// Send MMS with attachment (only for files under size limit)
async function sendMMS(
  accessToken: string,
  fromNumber: string,
  toNumber: string,
  message: string,
  attachmentUrl: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Check file size first
    const fileSize = await getFileSize(attachmentUrl);
    
    if (fileSize > MAX_MMS_SIZE || fileSize === 0) {
      // File too large - send as SMS with link instead
      console.log("File too large for MMS, sending as SMS with link");
      
      // Extract filename from URL for friendly display
      let fileName = "Document";
      try {
        const urlPath = new URL(attachmentUrl).pathname;
        const pathParts = urlPath.split("/");
        const rawName = pathParts[pathParts.length - 1];
        fileName = decodeURIComponent(rawName).replace(/^\d{13,}_/, '') || "Document";
      } catch {
        // Keep default
      }
      
      const textWithLink = message 
        ? `${message}\n\n📎 ${fileName}: ${attachmentUrl}`
        : `📎 ${fileName}: ${attachmentUrl}`;
      
      return await sendSMS(accessToken, fromNumber, toNumber, textWithLink);
    }
    
    const fileData = await downloadFileAsBase64(attachmentUrl);
    if (!fileData) {
      return { success: false, error: "Failed to download attachment" };
    }

    const boundary = `----RCBoundary${Date.now()}`;
    
    // Build multipart body
    let body = "";
    
    // JSON part
    body += `--${boundary}\r\n`;
    body += "Content-Type: application/json\r\n\r\n";
    body += JSON.stringify({
      from: { phoneNumber: fromNumber },
      to: [{ phoneNumber: toNumber }],
      text: message,
    });
    body += "\r\n";
    
    // Attachment part
    body += `--${boundary}\r\n`;
    body += `Content-Type: ${fileData.contentType}\r\n`;
    body += `Content-Disposition: attachment; filename="${fileData.fileName}"\r\n`;
    body += "Content-Transfer-Encoding: base64\r\n\r\n";
    body += fileData.base64;
    body += "\r\n";
    
    body += `--${boundary}--\r\n`;

    const response = await fetch(`${RC_API_BASE}/account/~/extension/~/sms`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/mixed; boundary=${boundary}`,
      },
      body: body,
    });

    if (response.ok) {
      const result = await response.json();
      return { success: true, messageId: result.id };
    } else {
      const errorText = await response.text();
      console.error("MMS send failed:", errorText);
      return { success: false, error: errorText };
    }
  } catch (err) {
    console.error("MMS error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// Send SMS (text only)
async function sendSMS(
  accessToken: string,
  fromNumber: string,
  toNumber: string,
  message: string
): Promise<{ success: boolean; messageId?: string; status?: string; error?: string }> {
  try {
    const response = await fetch(`${RC_API_BASE}/account/~/extension/~/sms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        from: { phoneNumber: fromNumber },
        to: [{ phoneNumber: toNumber }],
        text: message,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return { success: true, messageId: result.id, status: result.messageStatus };
    } else {
      const errorText = await response.text();
      console.error("SMS send failed:", errorText);
      return { success: false, error: errorText };
    }
  } catch (err) {
    console.error("SMS error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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
      ["admin", "office_manager", "virtual_assistant"],
    );
    if (authError) return authError;

    const { broadcast_id, company_id } = await req.json();

    if (!broadcast_id) {
      return new Response(
        JSON.stringify({ error: "broadcast_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get company's RingCentral connection
    let rcConnection: RingCentralConnection | null = null;
    
    if (company_id) {
      const { data } = await supabase
        .from("ringcentral_connections")
        .select("*")
        .eq("company_id", company_id)
        .single();
      rcConnection = data as RingCentralConnection | null;
    } else {
      // Get the first company if no company_id provided (single-tenant fallback)
      const { data: companyData } = await supabase
        .from("company_settings")
        .select("id")
        .limit(1)
        .single();

      if (companyData) {
        const { data } = await supabase
          .from("ringcentral_connections")
          .select("*")
          .eq("company_id", companyData.id)
          .single();
        rcConnection = data as RingCentralConnection | null;
      }
    }

    // Get broadcast details
    const { data: broadcast, error: broadcastError } = await supabase
      .from("broadcast_messages")
      .select("*")
      .eq("id", broadcast_id)
      .single();

    if (broadcastError || !broadcast) {
      return new Response(
        JSON.stringify({ error: "Broadcast not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get attachment URLs from broadcast
    const attachmentUrls: string[] = broadcast.attachment_urls || [];
    const hasAttachments = attachmentUrls.length > 0;

    if (attachmentUrls.some((url) => !isAllowedAttachmentUrl(url, supabaseUrl))) {
      return new Response(JSON.stringify({ error: "Broadcast contains an invalid attachment URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from("broadcast_recipients")
      .select("*")
      .eq("broadcast_id", broadcast_id)
      .eq("status", "pending");

    if (recipientsError) {
      throw recipientsError;
    }

    let sentCount = 0;
    let failedCount = 0;

    // Check if RingCentral is connected via OAuth
    if (!rcConnection) {
      return new Response(
        JSON.stringify({ error: "RingCentral is not connected" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else {
      // RingCentral is connected - refresh token if needed and send real messages
      const accessToken = await refreshAccessToken(supabase, rcConnection);
      
      if (!accessToken) {
        return new Response(
          JSON.stringify({ error: "Failed to authenticate with RingCentral. Please reconnect your account." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Use phone_number from connection or fallback to environment variable
      const fromNumber = rcConnection.phone_number || RC_FROM_NUMBER;

      if (!fromNumber) {
        return new Response(
          JSON.stringify({ error: "No SMS phone number configured. Please set RINGCENTRAL_FROM_NUMBER or reconnect RingCentral." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Send messages to each recipient
      for (const recipient of recipients as BroadcastRecipient[]) {
        if (!recipient.phone) {
          await supabase
            .from("broadcast_recipients")
            .update({
              status: "failed",
              error_message: "No phone number",
            })
            .eq("id", recipient.id);
          failedCount++;
          continue;
        }

        try {
          // Format phone number (ensure E.164 format)
          const formattedPhone = formatPhoneNumber(recipient.phone);
          let sendResult: { success: boolean; messageId?: string; status?: string; error?: string };

          if (hasAttachments) {
            // Send MMS with first attachment (RingCentral supports one attachment per message)
            // For multiple attachments, we need to send multiple messages
            for (let i = 0; i < attachmentUrls.length; i++) {
              const isLastAttachment = i === attachmentUrls.length - 1;
              const messageText = isLastAttachment ? (broadcast.message || "") : "";
              
              sendResult = await sendMMS(
                accessToken,
                fromNumber,
                formattedPhone,
                messageText,
                attachmentUrls[i]
              );

              if (!sendResult.success) {
                console.error("Failed to send broadcast MMS");
                break;
              }
            }
          } else {
            // Send regular SMS
            sendResult = await sendSMS(accessToken, fromNumber, formattedPhone, broadcast.message || "");
          }

          if (sendResult!.success) {
            await supabase
              .from("broadcast_recipients")
              .update({
                status: "sent",
                sent_at: new Date().toISOString(),
              })
              .eq("id", recipient.id);

            // Create message record for conversation history
            const { data: conversation } = await supabase
              .from("conversations")
              .select("id")
              .eq("customer_id", recipient.customer_id)
              .single();

            if (conversation) {
              await supabase.from("messages").insert({
                conversation_id: conversation.id,
                content: broadcast.message || "",
                sender_type: "user",
                attachment_url: attachmentUrls[0] || null,
              });
            }

            sentCount++;
          } else {
            await supabase
              .from("broadcast_recipients")
              .update({
                status: "failed",
                error_message: (sendResult!.error || "Unknown error").substring(0, 500),
              })
              .eq("id", recipient.id);
            
            failedCount++;
          }
        } catch (err) {
          console.error("Error sending broadcast recipient:", err);
          
          await supabase
            .from("broadcast_recipients")
            .update({
              status: "failed",
              error_message: err instanceof Error ? err.message : "Unknown error",
            })
            .eq("id", recipient.id);
          
          failedCount++;
        }
      }
    }

    // Update broadcast status
    await supabase
      .from("broadcast_messages")
      .update({
        status: failedCount === recipients?.length ? "failed" : "completed",
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq("id", broadcast_id);

    return new Response(
      JSON.stringify({
        success: true,
        sent_count: sentCount,
        failed_count: failedCount,
        total: recipients?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Broadcast error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper function to format phone numbers to E.164
function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, "");
  
  // If it starts with 1 and is 11 digits, it's already US format
  if (cleaned.startsWith("1") && cleaned.length === 11) {
    return `+${cleaned}`;
  }
  
  // If it's 10 digits, assume US and add +1
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // Otherwise, assume it's already in correct format
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}
