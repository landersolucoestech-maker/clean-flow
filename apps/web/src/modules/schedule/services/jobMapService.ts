import { supabase } from "@/integrations/supabase/client";

export interface JobMapPoint {
  latitude: number | string | null;
  longitude: number | string | null;
  status_type: string;
}

export async function getJobTrajectoryMapUrl(points: JobMapPoint[]) {
  const { data, error } = await supabase.functions.invoke("geoapify-map", {
    body: {
      points: points.map((point, index) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        status_type: point.status_type,
        index: index + 1,
      })),
    },
  });
  if (error) throw error;
  return typeof data?.mapUrl === "string" ? data.mapUrl : null;
}

export async function getJobAddressMapUrl(address: string) {
  const { data, error } = await supabase.functions.invoke("geoapify-map-fallback", {
    body: { address },
  });
  if (error) throw error;
  return typeof data?.mapUrl === "string" ? data.mapUrl : null;
}
