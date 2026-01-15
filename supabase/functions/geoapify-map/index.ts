import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MapRequest {
  points: Array<{
    latitude: number;
    longitude: number;
    status_type: string;
    index: number;
  }>;
  width?: number;
  height?: number;
}

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

    const body: MapRequest = await req.json();
    console.log("Received request body:", JSON.stringify(body));
    
    const { points, width = 580, height = 300 } = body;

    if (!points || points.length === 0) {
      console.error("No points provided");
      return new Response(
        JSON.stringify({ error: "No points provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build markers string - each marker on its own with proper encoding
    const markers = points.map((point) => {
      const color = point.status_type === "on_our_way" ? "3b82f6" :
                    point.status_type === "cleaning_now" ? "f97316" : "22c55e";
      return `lonlat:${point.longitude},${point.latitude};color:%23${color};size:medium;text:${point.index}`;
    }).join('|');

    // Build polyline geometry if 2+ points (connects points in order)
    let geometryParam = "";
    if (points.length >= 2) {
      // Format: linestring:lon1,lat1,lon2,lat2,...;linecolor:%23color;linewidth:3
      const coords = points.map(p => `${p.longitude},${p.latitude}`).join(',');
      geometryParam = `&geometry=polyline:${coords};linecolor:%23667eea;linewidth:4;lineopacity:0.8`;
    }

    // Calculate center and zoom
    const lats = points.map(p => p.latitude);
    const lons = points.map(p => p.longitude);
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;

    // Calculate zoom based on bounds with padding
    const latDiff = Math.max(...lats) - Math.min(...lats);
    const lonDiff = Math.max(...lons) - Math.min(...lons);
    const maxDiff = Math.max(latDiff, lonDiff);
    let zoom = 15;
    if (maxDiff > 0.01) zoom = 14;
    if (maxDiff > 0.05) zoom = 13;
    if (maxDiff > 0.1) zoom = 12;
    if (maxDiff > 0.5) zoom = 10;
    if (maxDiff > 1) zoom = 8;
    if (maxDiff > 5) zoom = 6;

    const mapUrl = `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=${width}&height=${height}&center=lonlat:${centerLon},${centerLat}&zoom=${zoom}&marker=${markers}${geometryParam}&apiKey=${apiKey}`;
    
    console.log("Generated map URL (without API key):", mapUrl.replace(apiKey, "***"));

    return new Response(
      JSON.stringify({ mapUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating map URL:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate map URL", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
