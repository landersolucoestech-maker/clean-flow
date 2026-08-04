import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyOAuthState } from "../_shared/oauth-state.ts";

const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

serve(async (req) => {
  if (!GOOGLE_CLIENT_SECRET) return new Response("Integration not configured", { status: 500 });

  const url = new URL(req.url);
  const state = url.searchParams.get("state");
  const stateData = state ? await verifyOAuthState(state, GOOGLE_CLIENT_SECRET) : null;
  if (!stateData || stateData.provider !== "google" || !stateData.returnUrl) {
    return new Response("Invalid or expired OAuth state", { status: 400 });
  }

  const returnUrl = new URL(stateData.returnUrl);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  if (error) returnUrl.searchParams.set("google_error", error);
  if (code && state) {
    returnUrl.searchParams.set("code", code);
    returnUrl.searchParams.set("oauth_state", state);
    returnUrl.searchParams.set("google_auth", "true");
  }

  if (!error && !code) return new Response("Missing OAuth response parameters", { status: 400 });
  return Response.redirect(returnUrl.toString(), 302);
});
