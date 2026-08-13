import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { authorizeStaffRequest } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type MapPoint = { latitude: number; longitude: number; status_type?: string; index?: number };

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

function validPoint(value: unknown): value is MapPoint {
  if (!value || typeof value !== "object") return false;
  const point = value as Partial<MapPoint>;
  return typeof point.latitude === "number" && Number.isFinite(point.latitude) && point.latitude >= -90 && point.latitude <= 90
    && typeof point.longitude === "number" && Number.isFinite(point.longitude) && point.longitude >= -180 && point.longitude <= 180;
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
    const points: MapPoint[] = Array.isArray(body.points)
      ? (body.points as unknown[]).filter(validPoint).slice(0, 50)
      : [];
    if (points.length === 0) return json({ error: "At least one valid map point is required" }, 400);

    const width = clamp(body.width, 320, 1600, 900);
    const height = clamp(body.height, 240, 1000, 500);
    const lats = points.map((point) => point.latitude);
    const lons = points.map((point) => point.longitude);
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
    const span = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lons) - Math.min(...lons));
    const zoom = span > 20 ? 3 : span > 10 ? 4 : span > 5 ? 5 : span > 2 ? 6 : span > 1 ? 7 : span > 0.5 ? 8 : span > 0.2 ? 9 : span > 0.1 ? 10 : 12;

    const markers = points.map((point, index) => {
      const color = point.status_type === "cleaning_done" ? "%2322c55e" : point.status_type === "cleaning_now" ? "%23f59e0b" : "%233b82f6";
      const label = encodeURIComponent(String(point.index || index + 1).slice(0, 3));
      return `lonlat:${point.longitude},${point.latitude};type:awesome;color:${color};size:medium;icon:circle;icontype:awesome;text:${label};textsize:small;textcolor:%23ffffff`;
    }).join("|");

    const params = new URLSearchParams({
      style: "osm-bright",
      width: String(width),
      height: String(height),
      center: `lonlat:${centerLon},${centerLat}`,
      zoom: String(zoom),
      marker: markers,
      apiKey,
    });
    const mapResponse = await fetch(`https://maps.geoapify.com/v1/staticmap?${params.toString()}`);
    if (!mapResponse.ok) return json({ error: "Could not render map" }, 502);

    const contentType = mapResponse.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) return json({ error: "Map provider returned an invalid response" }, 502);
    const bytes = new Uint8Array(await mapResponse.arrayBuffer());
    if (bytes.byteLength > 4 * 1024 * 1024) return json({ error: "Rendered map is too large" }, 502);
    return json({ mapUrl: `data:${contentType};base64,${bytesToBase64(bytes)}` });
  } catch (error) {
    console.error("Geoapify map error:", error);
    return json({ error: "Could not render map" }, 500);
  }
});
