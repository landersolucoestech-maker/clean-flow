import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { getAuthorizedStaffIdentity } from "../_shared/authorize.ts";
import { verifyOAuthState } from "../_shared/oauth-state.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RC_CLIENT_ID = Deno.env.get("RINGCENTRAL_CLIENT_ID");
const RC_CLIENT_SECRET = Deno.env.get("RINGCENTRAL_CLIENT_SECRET");
const RC_TOKEN_URL = "https://platform.ringcentral.com/restapi/oauth/token";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!RC_CLIENT_ID || !RC_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: "RingCentral credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authorization = await getAuthorizedStaffIdentity(
      req,
      supabase,
      ["admin", "office_manager"],
    );
    if (authorization.error) return authorization.error;

    const { code, state, redirect_uri } = await req.json();

    if (!code || !state || !redirect_uri) {
      return new Response(
        JSON.stringify({ error: "code, state, and redirect_uri are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stateData = await verifyOAuthState(state, RC_CLIENT_SECRET);
    if (
      !stateData
      || stateData.provider !== "ringcentral"
      || stateData.userId !== authorization.identity.userId
      || stateData.redirectUri !== redirect_uri
      || !stateData.companyId
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired state parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const company_id = stateData.companyId;

    // Exchange code for tokens
    const tokenResponse = await fetch(RC_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${RC_CLIENT_ID}:${RC_CLIENT_SECRET}`)}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to exchange authorization code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    // Calculate token expiration
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

    // Get extension info to retrieve phone number
    let phoneNumber = null;
    let extensionId = null;
    let accountId = null;

    try {
      const extensionResponse = await fetch(
        "https://platform.ringcentral.com/restapi/v1.0/account/~/extension/~",
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

      if (extensionResponse.ok) {
        const extensionData = await extensionResponse.json();
        extensionId = extensionData.id?.toString();
        accountId = extensionData.account?.id?.toString();
        
        // Get phone numbers
        const phoneResponse = await fetch(
          "https://platform.ringcentral.com/restapi/v1.0/account/~/extension/~/phone-number",
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          }
        );

        if (phoneResponse.ok) {
          const phoneData = await phoneResponse.json();
          // Find SMS-enabled phone number
          const smsPhone = phoneData.records?.find((p: { features?: string[] }) => 
            p.features?.includes("SmsSender")
          );
          phoneNumber = smsPhone?.phoneNumber || phoneData.records?.[0]?.phoneNumber;
        }
      }
    } catch (err) {
      console.error("Failed to get extension info:", err);
    }

    // Store tokens in database
    const { error: upsertError } = await supabase
      .from("ringcentral_connections")
      .upsert({
        company_id,
        access_token,
        refresh_token,
        token_expires_at: tokenExpiresAt.toISOString(),
        phone_number: phoneNumber,
        extension_id: extensionId,
        account_id: accountId,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "company_id",
      });

    if (upsertError) {
      console.error("Failed to store tokens:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to store connection" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        phone_number: phoneNumber,
        extension_id: extensionId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("RingCentral callback error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
