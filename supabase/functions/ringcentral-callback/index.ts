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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!RC_CLIENT_ID || !RC_CLIENT_SECRET) return json({ error: "RingCentral credentials not configured" }, 500);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const authorization = await getAuthorizedStaffIdentity(req, admin, ["admin", "office_manager"]);
    if (authorization.error) return authorization.error;
    const identity = authorization.identity;

    const { code, state, redirect_uri } = await req.json();
    if (typeof code !== "string" || typeof state !== "string" || typeof redirect_uri !== "string") {
      return json({ error: "code, state, and redirect_uri are required" }, 400);
    }

    const stateData = await verifyOAuthState(state, RC_CLIENT_SECRET);
    if (
      !stateData
      || stateData.provider !== "ringcentral"
      || stateData.userId !== identity.userId
      || stateData.companyId !== identity.companyId
      || stateData.redirectUri !== redirect_uri
    ) {
      return json({ error: "Invalid or expired state parameter" }, 400);
    }

    const tokenResponse = await fetch(RC_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${RC_CLIENT_ID}:${RC_CLIENT_SECRET}`)}`,
      },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri }),
    });
    const tokenData = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok) return json({ error: "Failed to exchange authorization code" }, 400);

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    if (typeof accessToken !== "string" || typeof refreshToken !== "string") {
      return json({ error: "RingCentral token response is incomplete" }, 502);
    }

    let phoneNumber: string | null = null;
    let extensionId: string | null = null;
    let accountId: string | null = null;
    const extensionResponse = await fetch(
      "https://platform.ringcentral.com/restapi/v1.0/account/~/extension/~",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (extensionResponse.ok) {
      const extension = await extensionResponse.json();
      extensionId = extension.id?.toString() || null;
      accountId = extension.account?.id?.toString() || null;

      const phoneResponse = await fetch(
        "https://platform.ringcentral.com/restapi/v1.0/account/~/extension/~/phone-number",
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (phoneResponse.ok) {
        const phones = await phoneResponse.json();
        const smsPhone = phones.records?.find((record: { features?: string[] }) => record.features?.includes("SmsSender"));
        phoneNumber = smsPhone?.phoneNumber || phones.records?.[0]?.phoneNumber || null;
      }
    }

    const { error } = await admin.from("ringcentral_connections").upsert({
      company_id: identity.companyId,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires_at: new Date(Date.now() + Number(tokenData.expires_in) * 1000).toISOString(),
      phone_number: phoneNumber,
      extension_id: extensionId,
      account_id: accountId,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "company_id" });
    if (error) throw new Error("Failed to store RingCentral connection");

    return json({ success: true, phone_number: phoneNumber, extension_id: extensionId });
  } catch (error) {
    console.error("RingCentral callback error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
