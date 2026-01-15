import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GEOAPIFY_API_KEY");
    
    if (!apiKey) {
      console.error("GEOAPIFY_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Geoapify API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { text, limit = 5 } = await req.json();

    if (!text || text.trim().length < 2) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Geoapify Autocomplete API
    const autocompleteUrl = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(text)}&limit=${limit}&format=json&apiKey=${apiKey}`;
    
    console.log("Fetching autocomplete for:", text);

    const response = await fetch(autocompleteUrl);
    
    if (!response.ok) {
      console.error("Geoapify API error:", response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch address suggestions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Parse results into structured format
    const results = (data.results || []).map((result: any) => ({
      formatted: result.formatted || "",
      street: result.street || "",
      housenumber: result.housenumber || "",
      city: result.city || result.county || "",
      state: result.state || result.state_code || "",
      postcode: result.postcode || "",
      country: result.country || "",
      lat: result.lat,
      lon: result.lon,
    }));

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in address autocomplete:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
