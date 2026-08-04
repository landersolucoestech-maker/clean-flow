import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authorizeStaffRequest } from "../_shared/authorize.ts";
import { createOAuthState } from "../_shared/oauth-state.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// RingCentral OAuth configuration
const RC_CLIENT_ID = Deno.env.get("RINGCENTRAL_CLIENT_ID");
const RC_CLIENT_SECRET = Deno.env.get("RINGCENTRAL_CLIENT_SECRET");
const RC_AUTHORIZE_URL = "https://platform.ringcentral.com/restapi/oauth/authorize";

// Space-delimited scopes per OAuth spec
// Keep minimal to avoid invalid_scope when the app permissions are not enabled yet.
const RC_SCOPE = "SMS";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!RC_CLIENT_ID || !RC_CLIENT_SECRET || !supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "RingCentral integration is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const authorizationError = await authorizeStaffRequest(
      req,
      adminClient,
      ["admin", "office_manager"],
    );
    if (authorizationError) return authorizationError;

    const { company_id, redirect_uri } = await req.json();

    if (!company_id || !redirect_uri) {
      return new Response(
        JSON.stringify({ error: "company_id and redirect_uri are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const state = await createOAuthState({
      companyId: company_id,
      redirectUri: redirect_uri,
      expiresAt: Date.now() + 10 * 60 * 1000,
      nonce: crypto.randomUUID(),
    }, RC_CLIENT_SECRET);

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
