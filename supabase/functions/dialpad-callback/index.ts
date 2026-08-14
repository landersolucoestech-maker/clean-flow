import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { getAuthorizedStaffIdentity } from "../_shared/authorize.ts";
import { verifyOAuthState } from "../_shared/oauth-state.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const CLIENT_ID = Deno.env.get("DIALPAD_CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("DIALPAD_CLIENT_SECRET");
const TOKEN_URL = "https://dialpad.com/oauth2/token";
const API_BASE = "https://dialpad.com/api/v2";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function expiryIso(expiresIn: unknown): string {
  const value = Number(expiresIn);
  const milliseconds = Number.isFinite(value) && value > 0
    ? (value > 10_000_000 ? value * 1000 : Date.now() + value * 1000)
    : Date.now() + 60 * 60 * 1000;
  return new Date(milliseconds).toISOString();
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

    const { code, state, redirect_uri } = await req.json();
    if (typeof code !== "string" || typeof state !== "string" || typeof redirect_uri !== "string") {
      return json({ error: "code, state, and redirect_uri are required" }, 400);
    }

    const stateData = await verifyOAuthState(state, CLIENT_SECRET);
    if (
      !stateData
      || stateData.provider !== "dialpad"
      || stateData.userId !== identity.userId
      || stateData.companyId !== identity.companyId
      || stateData.redirectUri !== redirect_uri
    ) return json({ error: "Invalid or expired state parameter" }, 400);

    const tokenResponse = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri,
      }),
    });
    const tokenData = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || typeof tokenData.access_token !== "string") {
      return json({ error: "Failed to exchange Dialpad authorization code" }, 400);
    }

    const accessToken = tokenData.access_token as string;
    const profileResponse = await fetch(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = profileResponse.ok ? await profileResponse.json().catch(() => ({})) : {};
    const phoneNumbers = Array.isArray(profile.phone_numbers) ? profile.phone_numbers : [];
    const phoneNumber = typeof phoneNumbers[0] === "string" ? phoneNumbers[0] : null;
    const displayName = [profile.first_name, profile.last_name].filter((part) => typeof part === "string" && part).join(" ") || null;
    const email = Array.isArray(profile.emails)
      ? profile.emails.find((value: unknown) => typeof value === "string") || null
      : typeof profile.email === "string" ? profile.email : null;
    const scopes = typeof tokenData.scope === "string" ? tokenData.scope.split(/\s+/).filter(Boolean) : [];
    const webhookSecret = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");

    const { data: connection, error: upsertError } = await admin
      .from("dialpad_connections")
      .upsert({
        company_id: identity.companyId,
        dialpad_user_id: profile.id != null ? String(profile.id) : null,
        email,
        display_name: displayName,
        phone_number: phoneNumber,
        access_token: accessToken,
        refresh_token: typeof tokenData.refresh_token === "string" ? tokenData.refresh_token : null,
        token_expires_at: expiryIso(tokenData.expires_in),
        scopes,
        webhook_secret: webhookSecret,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "company_id" })
      .select("id")
      .single();
    if (upsertError || !connection) throw new Error("Failed to store Dialpad connection");

    let webhookId: number | null = null;
    let subscriptionId: number | null = null;
    let webhookWarning: string | null = null;

    try {
      const webhookResponse = await fetch(`${API_BASE}/webhooks`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          hook_url: `${supabaseUrl}/functions/v1/dialpad-webhook?connection=${encodeURIComponent(connection.id)}`,
          secret: webhookSecret,
        }),
      });
      const webhookPayload = await webhookResponse.json().catch(() => ({}));
      if (!webhookResponse.ok || webhookPayload.id == null) throw new Error(`Webhook HTTP ${webhookResponse.status}`);
      webhookId = Number(webhookPayload.id);

      const subscriptionResponse = await fetch(`${API_BASE}/subscriptions/sms`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint_id: webhookId, direction: "all", enabled: true, status: true }),
      });
      const subscriptionPayload = await subscriptionResponse.json().catch(() => ({}));
      if (!subscriptionResponse.ok || subscriptionPayload.id == null) {
        throw new Error(`SMS subscription HTTP ${subscriptionResponse.status}`);
      }
      subscriptionId = Number(subscriptionPayload.id);

      const { error: webhookStoreError } = await admin
        .from("dialpad_connections")
        .update({ webhook_id: webhookId, sms_subscription_id: subscriptionId, updated_at: new Date().toISOString() })
        .eq("id", connection.id)
        .eq("company_id", identity.companyId);
      if (webhookStoreError) throw webhookStoreError;
    } catch (webhookError) {
      webhookWarning = webhookError instanceof Error ? webhookError.message : "Unable to configure Dialpad webhook";
      console.error("Dialpad webhook setup warning:", webhookError);
    }

    return json({
      success: true,
      phone_number: phoneNumber,
      user_id: profile.id != null ? String(profile.id) : null,
      webhook_configured: Boolean(webhookId && subscriptionId),
      warning: webhookWarning,
    });
  } catch (error) {
    console.error("Dialpad callback error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
