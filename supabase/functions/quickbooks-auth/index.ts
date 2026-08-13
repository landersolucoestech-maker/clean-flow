import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { getAuthorizedStaffIdentity } from "../_shared/authorize.ts";
import { createOAuthState, verifyOAuthState } from "../_shared/oauth-state.ts";
import { getQuickBooksConnection, quickBooksHeaders } from "../_shared/quickbooks.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const QUICKBOOKS_CLIENT_ID = Deno.env.get("QUICKBOOKS_CLIENT_ID");
const QUICKBOOKS_CLIENT_SECRET = Deno.env.get("QUICKBOOKS_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const QUICKBOOKS_REDIRECT_URI = `${SUPABASE_URL}/functions/v1/quickbooks-callback`;
const QUICKBOOKS_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!QUICKBOOKS_CLIENT_ID || !QUICKBOOKS_CLIENT_SECRET || !SUPABASE_URL || !serviceRoleKey) {
      return jsonResponse({ error: "QuickBooks integration is not configured" }, 500);
    }

    const adminClient = createClient(SUPABASE_URL, serviceRoleKey);
    const authorization = await getAuthorizedStaffIdentity(req, adminClient, ["admin", "office_manager"]);
    if (authorization.error) return authorization.error;
    const identity = authorization.identity;

    const body = await req.json();
    const action = body.action;

    if (action === "get-auth-url") {
      const requestOrigin = req.headers.get("Origin") || Deno.env.get("SITE_URL") || "";
      let returnUrl: string;
      try {
        const parsedOrigin = new URL(requestOrigin);
        if (!["http:", "https:"].includes(parsedOrigin.protocol)) throw new Error("Invalid origin");
        returnUrl = parsedOrigin.origin;
      } catch {
        return jsonResponse({ error: "A valid application origin is required" }, 400);
      }

      const state = await createOAuthState({
        provider: "quickbooks",
        userId: identity.userId,
        companyId: identity.companyId,
        redirectUri: QUICKBOOKS_REDIRECT_URI,
        returnUrl,
        expiresAt: Date.now() + 10 * 60 * 1000,
        nonce: crypto.randomUUID(),
      }, QUICKBOOKS_CLIENT_SECRET);

      const params = new URLSearchParams({
        client_id: QUICKBOOKS_CLIENT_ID,
        response_type: "code",
        scope: "com.intuit.quickbooks.accounting com.intuit.quickbooks.payment",
        redirect_uri: QUICKBOOKS_REDIRECT_URI,
        state,
      });
      return jsonResponse({ authUrl: `https://appcenter.intuit.com/connect/oauth2?${params.toString()}` });
    }

    if (action === "exchange-token") {
      const { code, realmId, state } = body;
      if (typeof code !== "string" || typeof realmId !== "string" || typeof state !== "string") {
        return jsonResponse({ error: "code, realmId and state are required" }, 400);
      }

      const stateData = await verifyOAuthState(state, QUICKBOOKS_CLIENT_SECRET);
      if (
        !stateData
        || stateData.provider !== "quickbooks"
        || stateData.userId !== identity.userId
        || stateData.companyId !== identity.companyId
        || stateData.redirectUri !== QUICKBOOKS_REDIRECT_URI
      ) {
        return jsonResponse({ error: "Invalid or expired OAuth state" }, 400);
      }

      const response = await fetch(QUICKBOOKS_TOKEN_URL, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${QUICKBOOKS_CLIENT_ID}:${QUICKBOOKS_CLIENT_SECRET}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: QUICKBOOKS_REDIRECT_URI }),
      });
      const tokens = await response.json();
      if (!response.ok) return jsonResponse({ error: tokens.error_description || "Token exchange failed" }, 400);

      const { error: storeError } = await adminClient.from("quickbooks_connections").upsert({
        company_id: identity.companyId,
        realm_id: realmId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString(),
        connected_at: new Date().toISOString(),
      }, { onConflict: "company_id" });
      if (storeError) throw new Error("Failed to store QuickBooks connection");

      return jsonResponse({ success: true, connected: true });
    }

    if (action === "status") {
      try {
        const connection = await getQuickBooksConnection(adminClient, identity.companyId);
        const response = await fetch(
          `https://quickbooks.api.intuit.com/v3/company/${connection.realm_id}/companyinfo/${connection.realm_id}?minorversion=65`,
          { headers: quickBooksHeaders(connection.access_token) },
        );
        if (!response.ok) return jsonResponse({ connected: true, companyName: null, provider_status: response.status });
        const result = await response.json();
        return jsonResponse({ connected: true, companyName: result?.CompanyInfo?.CompanyName || null });
      } catch {
        return jsonResponse({ connected: false, companyName: null });
      }
    }

    if (action === "disconnect") {
      const { error } = await adminClient
        .from("quickbooks_connections")
        .delete()
        .eq("company_id", identity.companyId);
      if (error) throw error;
      return jsonResponse({ success: true, connected: false });
    }

    return jsonResponse({ error: "Invalid action" }, 400);
  } catch (error: unknown) {
    console.error("QuickBooks Auth Error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
