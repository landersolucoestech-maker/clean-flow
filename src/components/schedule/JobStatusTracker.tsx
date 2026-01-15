import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  MapPin, 
  Clock, 
  History,
  Loader2,
  AlertCircle,
  Map
} from "lucide-react";
import { format } from "date-fns";
import { 
  useJobStatusHistory, 
  useTrackJobStatus, 
  StatusType,
  canEditStatusManually,
  canOnlyTriggerStatus 
} from "@/hooks/useJobStatusTracking";
import { useJobAutomations, getAutomationTrigger } from "@/hooks/useJobAutomations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface JobStatusTrackerProps {
  jobId: string;
  currentStatus: string;
  onOurWayTime: string | null;
  timeStarted: string | null;
  timeFinished: string | null;
  staffId: string;
  userRole: string;
  jobAddress?: string | null;
  customerId?: string;
  customerPhone?: string;
  customerName?: string;
  jobDate?: string;
}

interface StatusButtonProps {
  statusType: StatusType;
  label: string;
  icon: React.ReactNode;
  currentTime: string | null;
  isActive: boolean;
  isCompleted: boolean;
  onTrigger: () => void;
  isLoading: boolean;
  disabled: boolean;
}

// Helper to format time - handles both ISO dates and time strings like "7:30 AM"
const formatTimeDisplay = (timeValue: string): string => {
  // Try parsing as ISO date first
  const isoDate = new Date(timeValue);
  if (!isNaN(isoDate.getTime())) {
    return format(isoDate, "MM/dd/yyyy 'at' hh:mm:ss a");
  }
  
  // If it's a time string like "7:30 AM", just display it as-is
  return timeValue;
};

const StatusButton: React.FC<StatusButtonProps> = ({
  label,
  icon,
  currentTime,
  isActive,
  isCompleted,
  onTrigger,
  isLoading,
  disabled,
}) => {
  return (
    <div className={`
      relative p-3 rounded-lg border-2 transition-all
      ${isCompleted ? "border-green-500 bg-green-50 dark:bg-green-950/20" : 
        isActive ? "border-primary bg-primary/5" : 
        "border-muted bg-muted/20"}
    `}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{label}</span>
        </div>
        {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-500" />}
      </div>

      {currentTime ? (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatTimeDisplay(currentTime)}</span>
        </div>
      ) : (
        <Button
          onClick={onTrigger}
          disabled={disabled || isLoading}
          className="w-full mt-1 h-8"
          size="sm"
          variant={isActive ? "default" : "outline"}
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <MapPin className="h-3 w-3 mr-1" />
          )}
          Mark
        </Button>
      )}
    </div>
  );
};

// GPS Map Component showing trajectory
interface GPSMapViewProps {
  statusHistory: any[];
  isLoading: boolean;
  jobAddress?: string | null;
}

const GPSMapView: React.FC<GPSMapViewProps> = ({ statusHistory, isLoading, jobAddress }) => {
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState(false);

  const pointsWithGPS = useMemo(
    () => statusHistory.filter((r) => r.latitude != null && r.longitude != null),
    [statusHistory]
  );

  const pointsForMap = useMemo(() => {
    // Show US map and ignore points clearly outside the US (e.g., old test data)
    return pointsWithGPS.filter((p) => {
      const lat = Number(p.latitude);
      const lon = Number(p.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;

      const addr = String(p.address_resolved ?? "").toLowerCase();
      if (addr.includes("brazil") || addr.includes("brasil")) return false;

      // Approximate US boundaries (contiguous + Alaska + Hawaii)
      const inContiguousUS = lat >= 24 && lat <= 49 && lon >= -125 && lon <= -66;
      const inAlaska = lat >= 51 && lat <= 72 && lon >= -170 && lon <= -129;
      const inHawaii = lat >= 18 && lat <= 23 && lon >= -161 && lon <= -154;

      return inContiguousUS || inAlaska || inHawaii;
    });
  }, [pointsWithGPS]);

  const hasAnyHistory = statusHistory.length > 0;

  // Fetch map URL from backend functions - show marked location (GPS) when available
  useEffect(() => {
    const fetchMapUrl = async () => {
      setMapLoading(true);
      setMapError(false);
      setMapUrl(null);

      try {
        // 1) Prefer GPS points from status tracking (filtered to USA)
        if (pointsForMap.length > 0) {
          const { data, error } = await supabase.functions.invoke("geoapify-map", {
            body: {
              points: pointsForMap.map((p, index) => ({
                latitude: p.latitude,
                longitude: p.longitude,
                status_type: p.status_type,
                index: index + 1,
              })),
            },
          });

          if (error) throw error;
          if (data?.mapUrl) setMapUrl(data.mapUrl);
          return;
        }

        // 2) Fallback: render map centered on job address (when no valid GPS points)
        if (jobAddress) {
          const { data, error } = await supabase.functions.invoke("geoapify-map-fallback", {
            body: { address: jobAddress },
          });

          if (error) throw error;
          if (data?.mapUrl) setMapUrl(data.mapUrl);
        }
      } catch (err) {
        console.error("Error fetching map URL:", err);
        setMapError(true);
      } finally {
        setMapLoading(false);
      }
    };

    if (pointsForMap.length > 0 || jobAddress) {
      fetchMapUrl();
    } else {
      setMapUrl(null);
      setMapLoading(false);
    }
  }, [pointsForMap, jobAddress]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAnyHistory) {
    return (
      <div className="text-center text-muted-foreground p-8">
        <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No status records found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Static Map Image */}
      {mapLoading ? (
        <div className="flex items-center justify-center h-[400px] bg-muted/30 rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : mapUrl && !mapError ? (
        <div className="rounded-lg overflow-hidden border">
          <img
            src={mapUrl}
            alt="GPS trajectory map"
            loading="lazy"
            className="w-full h-[400px] object-cover"
            onError={() => setMapError(true)}
          />
        </div>
      ) : mapError ? (
        <div className="flex flex-col items-center justify-center h-[200px] bg-muted/30 rounded-lg text-muted-foreground">
          <AlertCircle className="h-8 w-8 mb-2" />
          <p className="text-sm">Could not load map</p>
        </div>
      ) : (
        <div className="text-center text-muted-foreground p-6 bg-muted/30 rounded-lg">
          <MapPin className="h-10 w-10 mx-auto mb-2 opacity-60" />
          <p className="text-sm">No map available</p>
        </div>
      )}

      {pointsForMap.length > 0 && (
        <div className="text-xs text-center text-muted-foreground">
          <a
            href={`https://www.google.com/maps/dir/${pointsForMap.map((p) => `${p.latitude},${p.longitude}`).join("/")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center justify-center gap-1"
          >
            <Map className="h-3 w-3" />
            Open trajectory in Google Maps
          </a>
        </div>
      )}
    </div>
  );
};

export const JobStatusTracker: React.FC<JobStatusTrackerProps> = ({
  jobId,
  currentStatus,
  onOurWayTime,
  timeStarted,
  timeFinished,
  staffId,
  userRole,
  jobAddress,
  customerId,
  customerPhone,
  customerName,
  jobDate,
}) => {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<StatusType | null>(null);
  const { data: statusHistory, isLoading: historyLoading } = useJobStatusHistory(jobId);
  const trackStatus = useTrackJobStatus();
  const triggerAutomation = useJobAutomations();

  const canOnlyTrigger = canOnlyTriggerStatus(userRole);

  const handleTriggerStatus = (statusType: StatusType) => {
    setLoadingStatus(statusType);
    trackStatus.mutate({
      jobId,
      statusType,
      staffId,
      isManualEdit: false,
    }, {
      onSuccess: () => {
        // Trigger automation message after successful status update
        const automationTrigger = getAutomationTrigger(statusType);
        if (automationTrigger && customerId && customerPhone && customerName) {
          triggerAutomation.mutate({
            trigger: automationTrigger,
            customerId,
            customerPhone,
            customerName,
            jobDate,
          });
        }
      },
      onSettled: () => setLoadingStatus(null),
    });
  };

  const statusConfig = [
    {
      type: "on_our_way" as StatusType,
      label: "On the Way",
      icon: <span className="text-base">🚗</span>,
      time: onOurWayTime,
    },
    {
      type: "cleaning_now" as StatusType,
      label: "Cleaning Now",
      icon: <span className="text-base">🏠</span>,
      time: timeStarted,
    },
    {
      type: "cleaning_done" as StatusType,
      label: "Completed",
      icon: <span className="text-base">✓</span>,
      time: timeFinished,
    },
  ];

  const canEdit = canEditStatusManually(userRole);

  const getStatusIndex = () => {
    if (timeFinished) return 3;
    if (timeStarted) return 2;
    if (onOurWayTime) return 1;
    return 0;
  };

  const currentIndex = getStatusIndex();

  return (
    <Card className="shadow-sm">
      <CardHeader className="py-2 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            GPS Tracking
          </CardTitle>
          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2">
                <History className="h-3 w-3 mr-1" />
                <span className="text-xs">History</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  GPS Map
                </DialogTitle>
                <DialogDescription>
                  Shows the position captured at the time of status marking.
                </DialogDescription>
              </DialogHeader>
              <GPSMapView statusHistory={statusHistory || []} isLoading={historyLoading} jobAddress={jobAddress ?? null} />
            </DialogContent>
          </Dialog>
        </div>

        {canOnlyTrigger && (
          <div className="flex items-center gap-2 text-xs text-amber-600 mt-1">
            <AlertCircle className="h-3 w-3" />
            <span>Your profile can only mark steps.</span>
          </div>
        )}
      </CardHeader>

      {canEdit && (
        <CardContent className="px-4 pb-3 pt-0">
          <div className="grid gap-2 md:grid-cols-3">
            {statusConfig.map((status, index) => (
              <StatusButton
                key={status.type}
                statusType={status.type}
                label={status.label}
                icon={status.icon}
                currentTime={status.time}
                isActive={index === currentIndex}
                isCompleted={index < currentIndex}
                onTrigger={() => handleTriggerStatus(status.type)}
                isLoading={loadingStatus === status.type}
                disabled={index > currentIndex}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default JobStatusTracker;
