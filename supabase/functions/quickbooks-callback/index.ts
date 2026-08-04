import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { verifyOAuthState } from "../_shared/oauth-state.ts";

const QUICKBOOKS_CLIENT_SECRET = Deno.env.get("QUICKBOOKS_CLIENT_SECRET");

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function callbackPage(message: Record<string, unknown>, targetOrigin: string): Response {
  return new Response(
    `<!doctype html><html><body><script>
      window.opener?.postMessage(${safeJson(message)}, ${safeJson(targetOrigin)});
      window.close();
    </script><p>You may close this window.</p></body></html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'none'; frame-ancestors 'none'",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}

serve(async (req: Request) => {
  if (!QUICKBOOKS_CLIENT_SECRET) return new Response("Integration not configured", { status: 500 });

  const url = new URL(req.url);
  const state = url.searchParams.get("state");
  const stateData = state ? await verifyOAuthState(state, QUICKBOOKS_CLIENT_SECRET) : null;
  if (!stateData || stateData.provider !== "quickbooks" || !stateData.returnUrl) {
    return new Response("Invalid or expired OAuth state", { status: 400 });
  }

  const error = url.searchParams.get("error");
  if (error) {
    return callbackPage({ type: "quickbooks-error", error }, stateData.returnUrl);
  }

  const code = url.searchParams.get("code");
  const realmId = url.searchParams.get("realmId");
  if (!code || !realmId || !state) return new Response("Missing OAuth parameters", { status: 400 });

  return callbackPage({ type: "quickbooks-callback", code, realmId, state }, stateData.returnUrl);
});
