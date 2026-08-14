import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { getAuthorizedStaffIdentity } from "../_shared/authorize.ts";
import { createOAuthState } from "../_shared/oauth-state.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const CLIENT_ID = Deno.env.get("DIALPAD_CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("DIALPAD_CLIENT_SECRET");
const AUTHORIZE_URL = "https://dialpad.com/oauth2/authorize";
const DEAUTHORIZE_URL = "https://dialpad.com/oauth2/deauthorize";
const SCOPE = Deno.env.get("DIALPAD_OAUTH_SCOPES") || "offline_access message_content_export";

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
    if (!CLIENT_ID || !CLIENT_SECRET || !supabaseUrl || !serviceRoleKey) {
      return json({ error: "Dialpad integration is not configured" }, 500);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const authorization = await getAuthorizedStaffIdentity(req, admin, ["admin", "office_manager"]);
    if (authorization.error) return authorization.error;
    const identity = authorization.identity;
    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "get-auth-url";

    if (action === "status") {
      const { data: connection, error } = await admin
        .from("dialpad_connections")
        .select("id, company_id, dialpad_user_id, email, display_name, phone_number, connected_at, token_expires_at, scopes")
        .eq("company_id", identity.companyId)
        .maybeSingle();
      if (error) throw error;

      const { data: settings, error: settingsError } = await admin
        .from("company_settings")
        .select("sms_provider")
        .eq("id", identity.companyId)
        .maybeSingle();
      if (settingsError) throw settingsError;

      return json({
        connected: Boolean(connection),
        connection: connection || null,
        sms_provider: settings?.sms_provider || "auto",
      });
    }

    if (action === "set-provider") {
      const provider = body.provider;
      if (!["auto", "ringcentral", "dialpad"].includes(provider)) {
        return json({ error: "Invalid SMS provider" }, 400);
      }
      const { error } = await admin
        .from("company_settings")
        .update({ sms_provider: provider, updated_at: new Date().toISOString() })
        .eq("id", identity.companyId);
      if (error) throw error;
      return json({ success: true, sms_provider: provider });
    }

    if (action === "disconnect") {
      const { data: connection } = await admin
        .from("dialpad_connections")
        .select("access_token")
        .eq("company_id", identity.companyId)
        .maybeSingle();

      if (connection?.access_token) {
        await fetch(DEAUTHORIZE_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${connection.access_token}` },
        }).catch(() => null);
      }

      const { error } = await admin
        .from("dialpad_connections")
        .delete()
        .eq("company_id", identity.companyId);
      if (error) throw error;

      await admin
        .from("company_settings")
        .update({ sms_provider: "auto", updated_at: new Date().toISOString() })
        .eq("id", identity.companyId)
        .eq("sms_provider", "dialpad");

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
        || redirect.pathname !== "/integrations/dialpad/callback"
        || redirect.search
        || redirect.hash
      ) throw new Error("Invalid redirect");
    } catch {
      return json({ error: "Invalid redirect_uri" }, 400);
    }

    const state = await createOAuthState({
      provider: "dialpad",
      userId: identity.userId,
      companyId: identity.companyId,
      redirectUri,
      expiresAt: Date.now() + 10 * 60 * 1000,
      nonce: crypto.randomUUID(),
    }, CLIENT_SECRET);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      state,
      scope: SCOPE,
    });

    return json({
      auth_url: `${AUTHORIZE_URL}?${params.toString()}`,
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      scope: SCOPE,
    });
  } catch (error) {
    console.error("Dialpad auth error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
