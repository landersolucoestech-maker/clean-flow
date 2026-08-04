import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { authorizeStaffRequest } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MapByAddressRequest {
  address: string;
  width?: number;
  height?: number;
}

async function geocodeAddress(address: string, apiKey: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const authError = await authorizeStaffRequest(req, supabase, [
      "admin", "cleaner", "driver", "cleaning_manager", "office_manager", "virtual_assistant",
    ]);
    if (authError) return authError;

    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address)}&apiKey=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data?.features?.length) {
      const [lon, lat] = data.features[0].geometry.coordinates;
      return { lat, lon };
    }
  } catch (e) {
    console.error("Error geocoding address:", e);
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GEOAPIFY_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Geoapify API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body: MapByAddressRequest = await req.json();
    const { address, width = 580, height = 300 } = body;

    if (!address || address.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: "Invalid address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const coords = await geocodeAddress(address, apiKey);
    if (!coords) {
      return new Response(
        JSON.stringify({ error: "Address not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const marker = `lonlat:${coords.lon},${coords.lat};color:%233b82f6;size:medium`;
    const mapUrl = `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=${width}&height=${height}&center=lonlat:${coords.lon},${coords.lat}&zoom=15&marker=${marker}&apiKey=${apiKey}`;

    return new Response(
      JSON.stringify({ mapUrl, center: coords }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in geoapify-map-fallback:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
