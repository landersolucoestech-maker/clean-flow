import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authorizeStaffRequest } from "../_shared/authorize.ts";
import { getGoogleConnection } from "../_shared/google.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const authorizationError = await authorizeStaffRequest(
      req,
      adminClient,
      ["admin", "office_manager"],
    );
    if (authorizationError) return authorizationError;

    const { action, startDate, endDate, pageToken, pageSize } = await req.json();
    const connection = await getGoogleConnection(adminClient);
    const token = connection.access_token;

    // List Local Services accounts
    if (action === "list-accounts") {
      const response = await fetch(
        "https://localservices.googleapis.com/v1/accountReports",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get detailed leads (message leads)
    if (action === "list-leads") {
      const params = new URLSearchParams();
      if (startDate) params.append("query.startDate.year", new Date(startDate).getFullYear().toString());
      if (startDate) params.append("query.startDate.month", (new Date(startDate).getMonth() + 1).toString());
      if (startDate) params.append("query.startDate.day", new Date(startDate).getDate().toString());
      if (endDate) params.append("query.endDate.year", new Date(endDate).getFullYear().toString());
      if (endDate) params.append("query.endDate.month", (new Date(endDate).getMonth() + 1).toString());
      if (endDate) params.append("query.endDate.day", new Date(endDate).getDate().toString());
      if (pageToken) params.append("pageToken", pageToken);
      if (pageSize) params.append("pageSize", pageSize.toString());

      const url = `https://localservices.googleapis.com/v1/detailedLeadReports?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get account report (aggregated metrics)
    if (action === "get-report") {
      const params = new URLSearchParams();
      if (startDate) {
        params.append("query.startDate.year", new Date(startDate).getFullYear().toString());
        params.append("query.startDate.month", (new Date(startDate).getMonth() + 1).toString());
        params.append("query.startDate.day", new Date(startDate).getDate().toString());
      }
      if (endDate) {
        params.append("query.endDate.year", new Date(endDate).getFullYear().toString());
        params.append("query.endDate.month", (new Date(endDate).getMonth() + 1).toString());
        params.append("query.endDate.day", new Date(endDate).getDate().toString());
      }

      const url = `https://localservices.googleapis.com/v1/accountReports?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Google Local Services Error:", error);
    const message = error instanceof Error ? error.message : "Unknown Google Local Services error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
