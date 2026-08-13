import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface JobGpsAlert {
  job_id: string;
  distance_from_job: number;
  status_type: string;
  triggered_at: string;
}

/**
 * Hook to fetch GPS distance alerts for jobs
 * Returns a map of job_id -> max distance alert
 */
export const useJobGpsAlerts = (jobIds: string[]) => {
  return useQuery({
    queryKey: ["job-gps-alerts", jobIds],
    queryFn: async () => {
      if (!jobIds.length) return new Map<string, JobGpsAlert>();
      
      const { data, error } = await supabase
        .from("job_status_tracking")
        .select("job_id, distance_from_job, status_type, triggered_at")
        .in("job_id", jobIds)
        .not("distance_from_job", "is", null)
        .gt("distance_from_job", 0)
        .order("distance_from_job", { ascending: false });

      if (error) {
        console.error("Error fetching GPS alerts:", error);
        return new Map<string, JobGpsAlert>();
      }

      // Create a map with the highest distance alert per job
      const alertsMap = new Map<string, JobGpsAlert>();
      for (const record of data || []) {
        if (!alertsMap.has(record.job_id) || 
            (record.distance_from_job || 0) > (alertsMap.get(record.job_id)?.distance_from_job || 0)) {
          alertsMap.set(record.job_id, {
            job_id: record.job_id,
            distance_from_job: record.distance_from_job || 0,
            status_type: record.status_type,
            triggered_at: record.triggered_at,
          });
        }
      }
      
      return alertsMap;
    },
    enabled: jobIds.length > 0,
    staleTime: 30000, // Cache for 30 seconds
  });
};

/**
 * Hook to check if a single job has GPS alerts
 */
export const useJobHasGpsAlert = (jobId: string | undefined) => {
  return useQuery({
    queryKey: ["job-gps-alert", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      
      const { data, error } = await supabase
        .from("job_status_tracking")
        .select("distance_from_job, status_type, triggered_at")
        .eq("job_id", jobId)
        .not("distance_from_job", "is", null)
        .gt("distance_from_job", 0)
        .order("distance_from_job", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching GPS alert:", error);
        return null;
      }

      return data;
    },
    enabled: !!jobId,
    staleTime: 30000,
  });
};
