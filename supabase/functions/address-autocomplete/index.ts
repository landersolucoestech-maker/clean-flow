import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { authorizeStaffRequest } from "../_shared/authorize.ts";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const apiKey = Deno.env.get("GEOAPIFY_API_KEY");
    if (!supabaseUrl || !serviceRoleKey || !apiKey) return json({ error: "Address service is not configured" }, 503);

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const authError = await authorizeStaffRequest(req, supabase, [
      "admin", "cleaner", "driver", "cleaning_manager", "office_manager", "virtual_assistant",
    ]);
    if (authError) return authError;

    const body = await req.json();
    const text = typeof body.text === "string" ? body.text.trim().slice(0, 200) : "";
    if (text.length < 2) return json({ results: [] });
    const requestedLimit = Number(body.limit);
    const limit = Number.isFinite(requestedLimit) ? Math.min(10, Math.max(1, Math.round(requestedLimit))) : 5;

    const params = new URLSearchParams({ text, limit: String(limit), format: "json", apiKey });
    const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`);
    if (!response.ok) {
      console.error("Geoapify autocomplete failed", response.status);
      return json({ error: "Failed to fetch address suggestions" }, 502);
    }

    const data = await response.json();
    const results = (Array.isArray(data.results) ? data.results : []).slice(0, limit).map((result: Record<string, unknown>) => ({
      formatted: typeof result.formatted === "string" ? result.formatted : "",
      street: typeof result.street === "string" ? result.street : "",
      housenumber: typeof result.housenumber === "string" ? result.housenumber : "",
      city: typeof result.city === "string" ? result.city : typeof result.county === "string" ? result.county : "",
      state: typeof result.state === "string" ? result.state : typeof result.state_code === "string" ? result.state_code : "",
      postcode: typeof result.postcode === "string" ? result.postcode : "",
      country: typeof result.country === "string" ? result.country : "",
      lat: typeof result.lat === "number" ? result.lat : null,
      lon: typeof result.lon === "number" ? result.lon : null,
    }));

    return json({ results });
  } catch (error) {
    console.error("Address autocomplete error:", error);
    return json({ error: "Failed to process request" }, 500);
  }
});
