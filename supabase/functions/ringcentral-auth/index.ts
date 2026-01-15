import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// RingCentral OAuth configuration
const RC_CLIENT_ID = Deno.env.get("RINGCENTRAL_CLIENT_ID");
const RC_AUTHORIZE_URL = "https://platform.ringcentral.com/restapi/oauth/authorize";

// Space-delimited scopes per OAuth spec
// Keep minimal to avoid invalid_scope when the app permissions are not enabled yet.
const RC_SCOPE = "SMS";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RC_CLIENT_ID) {
      return new Response(
        JSON.stringify({ error: "RingCentral Client ID not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { company_id, redirect_uri } = await req.json();

    console.log("ringcentral-auth request", {
      company_id,
      redirect_uri,
      client_id: RC_CLIENT_ID,
    });

    if (!company_id || !redirect_uri) {
      return new Response(
        JSON.stringify({ error: "company_id and redirect_uri are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create state parameter with company_id for security
    const state = btoa(JSON.stringify({ company_id, timestamp: Date.now() }));

    // Build OAuth authorization URL
    // IMPORTANT: RingCentral may not treat `+` as a space in query params.
    // Avoid URLSearchParams here so spaces become %20.
    const authUrl = `${RC_AUTHORIZE_URL}?${[
      ["response_type", "code"],
      ["client_id", RC_CLIENT_ID],
      ["redirect_uri", redirect_uri],
      ["state", state],
      ["scope", RC_SCOPE],
    ]
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&")}`;

    console.log("ringcentral-auth response", { auth_url: authUrl });

    return new Response(
      JSON.stringify({
        auth_url: authUrl,
        client_id: RC_CLIENT_ID,
        redirect_uri,
        scope: RC_SCOPE,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("RingCentral auth error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
