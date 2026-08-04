import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAuthorizedStaffIdentity } from "../_shared/authorize.ts";
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
    const authorization = await getAuthorizedStaffIdentity(
      req,
      adminClient,
      ["admin", "office_manager"],
    );
    if (authorization.error) return authorization.error;

    const body = await req.json();
    const action = typeof body.action === "string" ? body.action : "get-auth-url";

    if (action === "status") {
      const { data: connection, error } = await adminClient
        .from("ringcentral_connections")
        .select("id, company_id, phone_number, extension_id, account_id, connected_at, token_expires_at")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return new Response(JSON.stringify({
        connected: Boolean(connection),
        connection: connection || null,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "disconnect") {
      const { data: connection, error: findError } = await adminClient
        .from("ringcentral_connections")
        .select("id")
        .limit(1)
        .maybeSingle();
      if (findError) throw findError;
      if (connection) {
        const { error } = await adminClient.from("ringcentral_connections").delete().eq("id", connection.id);
        if (error) throw error;
      }
      return new Response(JSON.stringify({ connected: false, success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action !== "get-auth-url") {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const redirect_uri = body.redirect_uri;

    if (typeof redirect_uri !== "string") {
      return new Response(
        JSON.stringify({ error: "redirect_uri is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    try {
      const requestOrigin = new URL(req.headers.get("Origin") || "").origin;
      const redirect = new URL(redirect_uri);
      if (
        redirect.origin !== requestOrigin
        || redirect.pathname !== "/integrations/ringcentral/callback"
        || redirect.search
        || redirect.hash
      ) throw new Error("Invalid redirect");
    } catch {
      return new Response(JSON.stringify({ error: "Invalid redirect_uri" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: company, error: companyError } = await adminClient
      .from("company_settings")
      .select("id")
      .limit(1)
      .single();
    if (companyError || !company) {
      return new Response(JSON.stringify({ error: "Company settings not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const state = await createOAuthState({
      provider: "ringcentral",
      userId: authorization.identity.userId,
      companyId: company.id,
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
