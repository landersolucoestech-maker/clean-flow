import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state"); // Contains the return URL

  // Default return URL
  const defaultReturnUrl = Deno.env.get("SITE_URL") || "https://lovable.dev";
  
  if (error) {
    // Redirect back with error
    const returnUrl = state || defaultReturnUrl;
    const separator = returnUrl.includes("?") ? "&" : "?";
    return Response.redirect(`${returnUrl}${separator}google_error=${encodeURIComponent(error)}`, 302);
  }

  if (code) {
    // Redirect back to the app with the code
    // The state contains the original return URL with google_auth=true
    const returnUrl = state || `${defaultReturnUrl}/settings?google_auth=true`;
    
    // Add the code to the return URL
    const separator = returnUrl.includes("?") ? "&" : "?";
    return Response.redirect(`${returnUrl}${separator}code=${encodeURIComponent(code)}`, 302);
  }

  return new Response("Missing code parameter", { status: 400 });
});
