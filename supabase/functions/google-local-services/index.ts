import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { getAuthorizedStaffIdentity } from "../_shared/authorize.ts";
import { getGoogleConnection } from "../_shared/google.ts";

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

async function googleJson(response: Response): Promise<Response> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Google Local Services request failed", response.status);
    return json({ error: "Google Local Services request failed", provider_status: response.status }, 502);
  }
  return json(payload);
}

function appendDate(params: URLSearchParams, prefix: string, value: unknown): void {
  if (typeof value !== "string" || !value) return;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return;
  params.append(`${prefix}.year`, date.getUTCFullYear().toString());
  params.append(`${prefix}.month`, (date.getUTCMonth() + 1).toString());
  params.append(`${prefix}.day`, date.getUTCDate().toString());
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Backend not configured" }, 503);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const authorization = await getAuthorizedStaffIdentity(req, adminClient, ["admin", "office_manager"]);
    if (authorization.error) return authorization.error;

    const body = await req.json();
    const connection = await getGoogleConnection(adminClient, authorization.identity.companyId);
    const headers = { Authorization: `Bearer ${connection.access_token}` };

    if (body.action === "list-accounts") {
      return googleJson(await fetch("https://localservices.googleapis.com/v1/accountReports", { headers }));
    }

    if (body.action === "list-leads") {
      const params = new URLSearchParams();
      appendDate(params, "query.startDate", body.startDate);
      appendDate(params, "query.endDate", body.endDate);
      if (typeof body.pageToken === "string" && body.pageToken) params.set("pageToken", body.pageToken);
      const pageSize = Math.min(1000, Math.max(1, Number(body.pageSize) || 100));
      params.set("pageSize", pageSize.toString());
      return googleJson(await fetch(
        `https://localservices.googleapis.com/v1/detailedLeadReports?${params.toString()}`,
        { headers },
      ));
    }

    if (body.action === "get-report") {
      const params = new URLSearchParams();
      appendDate(params, "query.startDate", body.startDate);
      appendDate(params, "query.endDate", body.endDate);
      return googleJson(await fetch(
        `https://localservices.googleapis.com/v1/accountReports?${params.toString()}`,
        { headers },
      ));
    }

    return json({ error: "Invalid action" }, 400);
  } catch (error: unknown) {
    console.error("Google Local Services error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown Google Local Services error" }, 500);
  }
});
