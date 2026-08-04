import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

const DEFAULT_SITE_URL = Deno.env.get("SITE_URL") || "https://lovable.dev";
const GOOGLE_CALLBACK_PATH = "/integrations/google/callback";

// Scopes for Calendar (Local Services requires special Google approval)
const SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  // "https://www.googleapis.com/auth/localservices.pfp.readonly", // Requires Google LSA partner approval
].join(" ");

function safeReturnUrl(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) {
    return `${DEFAULT_SITE_URL}/settings`;
  }

  // Absolute URL
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      return `${DEFAULT_SITE_URL}/settings`;
    }
    return u.toString();
  } catch {
    // Relative path
    if (raw.startsWith("/")) {
      return `${DEFAULT_SITE_URL}${raw}`;
    }
    return `${DEFAULT_SITE_URL}/settings`;
  }
}

function buildCallbackUrlFromReturnUrl(returnUrl: string): string {
  try {
    const u = new URL(returnUrl);
    return `${u.origin}${GOOGLE_CALLBACK_PATH}`;
  } catch {
    return `${DEFAULT_SITE_URL}${GOOGLE_CALLBACK_PATH}`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body.action;

    // Backwards compat: older clients used redirectUri as returnUrl.
    const returnUrl = safeReturnUrl(body.returnUrl ?? body.redirectUri);
    const oauthRedirectUri =
      typeof body.oauthRedirectUri === "string" && body.oauthRedirectUri
        ? body.oauthRedirectUri
        : buildCallbackUrlFromReturnUrl(returnUrl);

    if (action === "get-auth-url") {
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: oauthRedirectUri,
        response_type: "code",
        scope: SCOPES,
        access_type: "offline",
        prompt: "consent",
        state: returnUrl,
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "exchange-token") {
      const code = body.code;
      if (typeof code !== "string" || !code) {
        return new Response(JSON.stringify({ error: "Missing code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Important: must match the redirect_uri used during authorization.
      const redirectUriForToken =
        (typeof body.oauthRedirectUri === "string" && body.oauthRedirectUri) ||
        (typeof body.redirectUri === "string" && body.redirectUri) ||
        oauthRedirectUri;

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUriForToken,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        throw new Error(tokenData.error_description || tokenData.error);
      }

      // Get user info
      const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userInfo = await userResponse.json();

      return new Response(
        JSON.stringify({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresIn: tokenData.expires_in,
          tokenType: tokenData.token_type,
          scope: tokenData.scope,
          userInfo: {
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "refresh-token") {
      const refreshToken = body.refreshToken;
      if (typeof refreshToken !== "string" || !refreshToken) {
        return new Response(JSON.stringify({ error: "Missing refreshToken" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        throw new Error(tokenData.error_description || tokenData.error);
      }

      return new Response(
        JSON.stringify({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || refreshToken,
          expiresIn: tokenData.expires_in,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Google Auth Error:", error);
    const message = error instanceof Error ? error.message : "Unknown Google authentication error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
