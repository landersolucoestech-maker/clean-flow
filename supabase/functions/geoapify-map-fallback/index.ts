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
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, max-age=60" },
  });
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(max, Math.max(min, Math.round(numeric))) : fallback;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 8192, bytes.length)));
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const apiKey = Deno.env.get("GEOAPIFY_API_KEY");
    if (!supabaseUrl || !serviceRoleKey || !apiKey) return json({ error: "Map service is not configured" }, 503);

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const authError = await authorizeStaffRequest(req, supabase, ["admin", "cleaner", "driver", "cleaning_manager", "office_manager", "virtual_assistant"]);
    if (authError) return authError;

    const body = await req.json();
    const address = typeof body.address === "string" ? body.address.trim().slice(0, 500) : "";
    if (!address) return json({ error: "address is required" }, 400);
    const width = clamp(body.width, 320, 1600, 900);
    const height = clamp(body.height, 240, 1000, 500);

    const geocodeParams = new URLSearchParams({ text: address, limit: "1", apiKey });
    const geocodeResponse = await fetch(`https://api.geoapify.com/v1/geocode/search?${geocodeParams.toString()}`);
    if (!geocodeResponse.ok) return json({ error: "Could not geocode address" }, 502);
    const geocode = await geocodeResponse.json();
    const coordinates = geocode.features?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) return json({ error: "Address not found" }, 404);
    const lon = Number(coordinates[0]);
    const lat = Number(coordinates[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return json({ error: "Address coordinates are invalid" }, 502);

    const mapParams = new URLSearchParams({
      style: "osm-bright",
      width: String(width),
      height: String(height),
      center: `lonlat:${lon},${lat}`,
      zoom: "15",
      marker: `lonlat:${lon},${lat};type:awesome;color:%233b82f6;size:large;icon:location-dot;icontype:awesome`,
      apiKey,
    });
    const mapResponse = await fetch(`https://maps.geoapify.com/v1/staticmap?${mapParams.toString()}`);
    if (!mapResponse.ok) return json({ error: "Could not render map" }, 502);
    const contentType = mapResponse.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) return json({ error: "Map provider returned an invalid response" }, 502);
    const bytes = new Uint8Array(await mapResponse.arrayBuffer());
    if (bytes.byteLength > 4 * 1024 * 1024) return json({ error: "Rendered map is too large" }, 502);
    return json({ mapUrl: `data:${contentType};base64,${bytesToBase64(bytes)}` });
  } catch (error) {
    console.error("Geoapify fallback map error:", error);
    return json({ error: "Could not render map" }, 500);
  }
});
