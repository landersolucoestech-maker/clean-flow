import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { getAuthorizedStaffIdentity } from "../_shared/authorize.ts";
import { getGoogleConnection } from "../_shared/google.ts";
import { createOAuthState, verifyOAuthState } from "../_shared/oauth-state.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const GOOGLE_CALLBACK_PATH = "/integrations/google/callback";
const SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Google integration is not configured" }, 500);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const authorization = await getAuthorizedStaffIdentity(
      req,
      adminClient,
      ["admin", "office_manager"],
    );
    if (authorization.error) return authorization.error;

    const body = await req.json();
    const action = body.action;

    if (action === "get-auth-url") {
      const originHeader = req.headers.get("Origin");
      let origin: string;
      try {
        const parsedOrigin = new URL(originHeader || "");
        if (!["http:", "https:"].includes(parsedOrigin.protocol)) throw new Error("Invalid origin");
        origin = parsedOrigin.origin;
      } catch {
        return jsonResponse({ error: "A valid application origin is required" }, 400);
      }

      let returnUrl = `${origin}/settings`;
      if (typeof body.returnUrl === "string") {
        try {
          const candidate = new URL(body.returnUrl, origin);
          if (candidate.origin === origin) returnUrl = candidate.toString();
        } catch {
          // Keep safe default.
        }
      }

      const { data: company, error: companyError } = await adminClient
        .from("company_settings")
        .select("id")
        .limit(1)
        .single();
      if (companyError || !company) return jsonResponse({ error: "Company settings not found" }, 404);

      const redirectUri = `${origin}${GOOGLE_CALLBACK_PATH}`;
      const state = await createOAuthState({
        provider: "google",
        userId: authorization.identity.userId,
        companyId: company.id,
        redirectUri,
        returnUrl,
        expiresAt: Date.now() + 10 * 60 * 1000,
        nonce: crypto.randomUUID(),
      }, GOOGLE_CLIENT_SECRET);

      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: SCOPES,
        access_type: "offline",
        prompt: "consent",
        state,
      });
      return jsonResponse({ authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
    }

    if (action === "exchange-token") {
      const { code, state } = body;
      if (typeof code !== "string" || typeof state !== "string") {
        return jsonResponse({ error: "code and state are required" }, 400);
      }

      const stateData = await verifyOAuthState(state, GOOGLE_CLIENT_SECRET);
      if (
        !stateData
        || stateData.provider !== "google"
        || stateData.userId !== authorization.identity.userId
        || !stateData.companyId
      ) {
        return jsonResponse({ error: "Invalid or expired OAuth state" }, 400);
      }

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: stateData.redirectUri,
        }),
      });
      const tokens = await tokenResponse.json();
      if (!tokenResponse.ok) return jsonResponse({ error: tokens.error_description || "Token exchange failed" }, 400);

      const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const userInfo = await userResponse.json();
      if (!userResponse.ok) return jsonResponse({ error: "Failed to load Google account" }, 400);

      const { data: existing } = await adminClient
        .from("google_connections")
        .select("refresh_token")
        .eq("company_id", stateData.companyId)
        .maybeSingle();
      const refreshToken = tokens.refresh_token || existing?.refresh_token;
      if (!refreshToken) return jsonResponse({ error: "Google did not provide a refresh token" }, 400);

      const scopes = String(tokens.scope || SCOPES).split(/\s+/).filter(Boolean);
      const { error: storeError } = await adminClient.from("google_connections").upsert({
        company_id: stateData.companyId,
        google_user_id: userInfo.id || null,
        email: userInfo.email || null,
        name: userInfo.name || null,
        picture_url: userInfo.picture || null,
        scopes,
        access_token: tokens.access_token,
        refresh_token: refreshToken,
        token_expires_at: new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString(),
        connected_at: new Date().toISOString(),
      }, { onConflict: "company_id" });
      if (storeError) throw new Error("Failed to store Google connection");

      return jsonResponse({ success: true, connected: true, returnUrl: stateData.returnUrl || "/settings" });
    }

    if (action === "status") {
      try {
        const connection = await getGoogleConnection(adminClient);
        return jsonResponse({
          connected: true,
          scopes: connection.scopes,
          userInfo: {
            email: connection.email,
            name: connection.name,
            picture: connection.picture_url,
          },
        });
      } catch {
        return jsonResponse({ connected: false, scopes: [], userInfo: null });
      }
    }

    if (action === "disconnect") {
      const { data: connection, error: findError } = await adminClient
        .from("google_connections")
        .select("id")
        .limit(1)
        .maybeSingle();
      if (findError) throw findError;
      if (connection) {
        const { error } = await adminClient.from("google_connections").delete().eq("id", connection.id);
        if (error) throw error;
      }
      return jsonResponse({ success: true, connected: false });
    }

    return jsonResponse({ error: "Invalid action" }, 400);
  } catch (error: unknown) {
    console.error("Google Auth Error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
