import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { getAuthorizedStaffIdentity } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Backend not configured" }, 503);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const authorization = await getAuthorizedStaffIdentity(
      req,
      admin,
      ["admin", "office_manager", "cleaning_manager", "virtual_assistant"],
    );
    if (authorization.error) return authorization.error;

    return json({
      resend: {
        configured: Boolean(Deno.env.get("RESEND_API_KEY") && Deno.env.get("EMAIL_FROM")),
      },
      dialpad: {
        oauth_configured: Boolean(Deno.env.get("DIALPAD_CLIENT_ID") && Deno.env.get("DIALPAD_CLIENT_SECRET")),
      },
      ringcentral: {
        oauth_configured: Boolean(Deno.env.get("RINGCENTRAL_CLIENT_ID") && Deno.env.get("RINGCENTRAL_CLIENT_SECRET")),
      },
      google: {
        oauth_configured: Boolean(Deno.env.get("GOOGLE_CLIENT_ID") && Deno.env.get("GOOGLE_CLIENT_SECRET")),
      },
      quickbooks: {
        oauth_configured: Boolean(Deno.env.get("QUICKBOOKS_CLIENT_ID") && Deno.env.get("QUICKBOOKS_CLIENT_SECRET")),
      },
    });
  } catch (error) {
    console.error("Integration status error:", error);
    return json({ error: "Unable to read integration status" }, 500);
  }
});
