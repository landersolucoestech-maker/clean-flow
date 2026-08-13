import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { getAuthorizedStaffIdentity } from "../_shared/authorize.ts";
import { createOAuthState } from "../_shared/oauth-state.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const RC_CLIENT_ID = Deno.env.get("RINGCENTRAL_CLIENT_ID");
const RC_CLIENT_SECRET = Deno.env.get("RINGCENTRAL_CLIENT_SECRET");
const RC_AUTHORIZE_URL = "https://platform.ringcentral.com/restapi/oauth/authorize";
const RC_SCOPE = "SMS";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!RC_CLIENT_ID || !RC_CLIENT_SECRET || !supabaseUrl || !serviceRoleKey) {
      return json({ error: "RingCentral integration is not configured" }, 500);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const authorization = await getAuthorizedStaffIdentity(req, adminClient, ["admin", "office_manager"]);
    if (authorization.error) return authorization.error;
    const identity = authorization.identity;

    const body = await req.json();
    const action = typeof body.action === "string" ? body.action : "get-auth-url";

    if (action === "status") {
      const { data: connection, error } = await adminClient
        .from("ringcentral_connections")
        .select("id, company_id, phone_number, extension_id, account_id, connected_at, token_expires_at")
        .eq("company_id", identity.companyId)
        .maybeSingle();
      if (error) throw error;
      return json({ connected: Boolean(connection), connection: connection || null });
    }

    if (action === "disconnect") {
      const { error } = await adminClient
        .from("ringcentral_connections")
        .delete()
        .eq("company_id", identity.companyId);
      if (error) throw error;
      return json({ connected: false, success: true });
    }

    if (action !== "get-auth-url") return json({ error: "Invalid action" }, 400);
    const redirectUri = body.redirect_uri;
    if (typeof redirectUri !== "string") return json({ error: "redirect_uri is required" }, 400);

    try {
      const requestOrigin = new URL(req.headers.get("Origin") || "").origin;
      const redirect = new URL(redirectUri);
      if (
        redirect.origin !== requestOrigin
        || redirect.pathname !== "/integrations/ringcentral/callback"
        || redirect.search
        || redirect.hash
      ) throw new Error("Invalid redirect");
    } catch {
      return json({ error: "Invalid redirect_uri" }, 400);
    }

    const state = await createOAuthState({
      provider: "ringcentral",
      userId: identity.userId,
      companyId: identity.companyId,
      redirectUri,
      expiresAt: Date.now() + 10 * 60 * 1000,
      nonce: crypto.randomUUID(),
    }, RC_CLIENT_SECRET);

    const authUrl = `${RC_AUTHORIZE_URL}?${[
      ["response_type", "code"],
      ["client_id", RC_CLIENT_ID],
      ["redirect_uri", redirectUri],
      ["state", state],
      ["scope", RC_SCOPE],
    ].map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join("&")}`;

    return json({ auth_url: authUrl, client_id: RC_CLIENT_ID, redirect_uri: redirectUri, scope: RC_SCOPE });
  } catch (error) {
    console.error("RingCentral auth error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
