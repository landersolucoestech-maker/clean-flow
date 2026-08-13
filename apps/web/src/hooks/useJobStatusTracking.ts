import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type StatusType = "on_our_way" | "cleaning_now" | "cleaning_done";

export interface JobStatusTracking {
  id: string;
  job_id: string;
  status_type: StatusType;
  triggered_by: string | null;
  triggered_at: string;
  latitude: number | null;
  longitude: number | null;
  accuracy_meters: number | null;
  address_resolved: string | null;
  device_info: Record<string, unknown> | null;
  is_manual_edit: boolean;
  edited_by: string | null;
  edited_at: string | null;
  previous_value: string | null;
  created_at: string;
  updated_at: string;
}

interface TrackStatusParams {
  jobId: string;
  statusType: StatusType;
  staffId: string;
  isManualEdit?: boolean;
  previousValue?: string;
}

interface DistanceWarning {
  distance: number;
  threshold: number;
  message: string;
}

interface TrackStatusResponse {
  success: boolean;
  tracking: JobStatusTracking;
  serverTimestamp: string;
  addressResolved: string | null;
  distanceWarning: DistanceWarning | null;
  permissions: {
    canEdit: boolean;
    canTrigger: boolean;
    role: string;
  };
}

// Get current position with high accuracy
const getCurrentPosition = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};

// Get device info for audit purposes
const getDeviceInfo = (): Record<string, unknown> => {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    timestamp: new Date().toISOString(),
  };
};

// Hook to fetch tracking history for a job
export function useJobStatusHistory(jobId: string | null) {
  return useQuery({
    queryKey: ["job-status-tracking", jobId],
    queryFn: async () => {
      if (!jobId) return [];

      const { data, error } = await supabase.functions.invoke("job-status-history", {
        body: { jobId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return (data?.history ?? []) as (JobStatusTracking & {
        triggered_by_staff: { id: string; name: string } | null;
        edited_by_staff: { id: string; name: string } | null;
      })[];
    },
    enabled: !!jobId,
  });
}

// Hook to track status with GPS
export function useTrackJobStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: TrackStatusParams): Promise<TrackStatusResponse> => {
      const { jobId, statusType, staffId, isManualEdit = false, previousValue } = params;

      // Get GPS location
      let latitude: number | undefined;
      let longitude: number | undefined;
      let accuracy: number | undefined;

      try {
        const position = await getCurrentPosition();
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        accuracy = position.coords.accuracy;
      } catch (geoError) {
        console.warn("Could not get GPS location:", geoError);
        // Continue without GPS - will be noted in the record
        toast.warning("Localização GPS não disponível. O status será registrado sem coordenadas.");
      }

      // Get device info
      const deviceInfo = getDeviceInfo();

      // Call edge function
      const { data, error } = await supabase.functions.invoke("track-job-status", {
        body: {
          jobId,
          statusType,
          staffId,
          latitude,
          longitude,
          accuracy,
          deviceInfo,
          isManualEdit,
          previousValue,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to track status");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data as TrackStatusResponse;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["job-status-tracking", variables.jobId] });
      
      const statusLabels: Record<StatusType, string> = {
        on_our_way: "A caminho",
        cleaning_now: "Limpeza iniciada",
        cleaning_done: "Limpeza concluída",
      };

      // Show distance warning if GPS is too far from job location
      if (data.distanceWarning) {
        toast.warning("Alerta de localização", {
          description: data.distanceWarning.message,
          duration: 8000,
        });
      }

      toast.success(`Status atualizado: ${statusLabels[variables.statusType]}`, {
        description: data.addressResolved 
          ? `Localização: ${data.addressResolved.slice(0, 50)}...` 
          : "Sem localização GPS disponível",
      });
    },
    onError: (error: Error) => {
      console.error("Error tracking status:", error);
      
      if (error.message.includes("PERMISSION_DENIED")) {
        toast.error("Permissão negada", {
          description: "Seu perfil não permite editar manualmente os horários de status.",
        });
      } else {
        toast.error("Erro ao atualizar status", {
          description: error.message,
        });
      }
    },
  });
}

// Helper to check if user role can edit status manually
export function canEditStatusManually(role: string | null): boolean {
  if (!role) return false;
  return ["admin", "virtual_assistant", "office_manager", "cleaning_manager"].includes(role);
}

// Helper to check if user role can only trigger (not edit)
export function canOnlyTriggerStatus(role: string | null): boolean {
  if (!role) return false;
  return ["driver", "cleaner"].includes(role);
}
