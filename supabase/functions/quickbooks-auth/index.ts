import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QUICKBOOKS_CLIENT_ID = Deno.env.get("QUICKBOOKS_CLIENT_ID");
const QUICKBOOKS_CLIENT_SECRET = Deno.env.get("QUICKBOOKS_CLIENT_SECRET");
const QUICKBOOKS_REDIRECT_URI = Deno.env.get("SUPABASE_URL") + "/functions/v1/quickbooks-callback";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, code, realmId, refreshToken } = await req.json();

    if (action === "get-auth-url") {
      const scopes = "com.intuit.quickbooks.accounting com.intuit.quickbooks.payment";
      const authUrl = `https://appcenter.intuit.com/connect/oauth2?client_id=${QUICKBOOKS_CLIENT_ID}&response_type=code&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(QUICKBOOKS_REDIRECT_URI)}&state=security_token`;
      
      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "exchange-token") {
      const tokenUrl = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
      const credentials = btoa(`${QUICKBOOKS_CLIENT_ID}:${QUICKBOOKS_CLIENT_SECRET}`);
      
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: QUICKBOOKS_REDIRECT_URI!,
        }),
      });

      const tokens = await response.json();
      
      if (!response.ok) {
        throw new Error(tokens.error_description || "Failed to exchange token");
      }

      return new Response(JSON.stringify({ 
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        realmId: realmId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "refresh-token") {
      const tokenUrl = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
      const credentials = btoa(`${QUICKBOOKS_CLIENT_ID}:${QUICKBOOKS_CLIENT_SECRET}`);
      
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      });

      const tokens = await response.json();
      
      if (!response.ok) {
        throw new Error(tokens.error_description || "Failed to refresh token");
      }

      return new Response(JSON.stringify({ 
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("QuickBooks Auth Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
