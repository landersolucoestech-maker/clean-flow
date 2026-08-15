import { T } from "@/shared/components/i18n/T";
import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  MapPin,
  Clock,
  History,
  Loader2,
  AlertCircle,
  Map,
} from "lucide-react";
import { format } from "date-fns";
import {
  useJobStatusHistory,
  useTrackJobStatus,
  type StatusType,
  canEditStatusManually,
  canOnlyTriggerStatus,
} from "@/hooks/useJobStatusTracking";
import type { JobStatusTracking } from "@/hooks/useJobStatusTracking";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getJobAddressMapUrl, getJobTrajectoryMapUrl } from "../services/jobMapService";

interface JobStatusTrackerProps {
  jobId: string;
  currentStatus: string;
  onOurWayTime: string | null;
  timeStarted: string | null;
  timeFinished: string | null;
  staffId: string | null;
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

const formatTimeDisplay = (timeValue: string): string => {
  const isoDate = new Date(timeValue);
  if (!Number.isNaN(isoDate.getTime())) return format(isoDate, "MM/dd/yyyy 'at' hh:mm:ss a");
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
}) => (
  <div className={`relative p-3 rounded-lg border-2 transition-colors ${
    isCompleted
      ? "border-success bg-success/5"
      : isActive
        ? "border-primary bg-primary/5"
        : "border-muted bg-muted/20"
  }`}>
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-medium text-sm">{label}</span>
      </div>
      {isCompleted && <CheckCircle2 className="h-4 w-4 text-success" />}
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
        {isLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <MapPin className="h-3 w-3 mr-1" />}
        Mark
      </Button>
    )}
  </div>
);

interface GPSMapViewProps {
  statusHistory: JobStatusTracking[];
  isLoading: boolean;
  jobAddress?: string | null;
}

const GPSMapView: React.FC<GPSMapViewProps> = ({ statusHistory, isLoading, jobAddress }) => {
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState(false);

  const pointsWithGPS = useMemo(
    () => statusHistory.filter((record) => record.latitude != null && record.longitude != null),
    [statusHistory],
  );

  const pointsForMap = useMemo(() => pointsWithGPS.filter((point) => {
    const lat = Number(point.latitude);
    const lon = Number(point.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
    const address = String(point.address_resolved ?? "").toLowerCase();
    if (address.includes("brazil") || address.includes("brasil")) return false;
    const inContiguousUS = lat >= 24 && lat <= 49 && lon >= -125 && lon <= -66;
    const inAlaska = lat >= 51 && lat <= 72 && lon >= -170 && lon <= -129;
    const inHawaii = lat >= 18 && lat <= 23 && lon >= -161 && lon <= -154;
    return inContiguousUS || inAlaska || inHawaii;
  }), [pointsWithGPS]);

  useEffect(() => {
    let active = true;
    const fetchMapUrl = async () => {
      setMapLoading(true);
      setMapError(false);
      setMapUrl(null);
      try {
        const nextMapUrl = pointsForMap.length > 0
          ? await getJobTrajectoryMapUrl(pointsForMap)
          : jobAddress
            ? await getJobAddressMapUrl(jobAddress)
            : null;
        if (active) setMapUrl(nextMapUrl);
      } catch {
        if (active) setMapError(true);
      } finally {
        if (active) setMapLoading(false);
      }
    };
    if (pointsForMap.length > 0 || jobAddress) void fetchMapUrl();
    else {
      setMapUrl(null);
      setMapLoading(false);
    }
    return () => { active = false; };
  }, [pointsForMap, jobAddress]);

  if (isLoading) {
    return <div className="flex items-center justify-center p-5"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!statusHistory.length) {
    return (
      <div className="text-center text-muted-foreground p-5">
        <History className="h-8 w-8 mx-auto mb-4 opacity-50" />
        <p><T k="literal.schedule.no_status_records_found.24ae5c14" /></p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {mapLoading ? (
        <div className="flex items-center justify-center h-[400px] bg-muted/30 rounded-lg"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : mapUrl && !mapError ? (
        <div className="rounded-lg overflow-hidden border">
          <img src={mapUrl} alt="GPS trajectory map" loading="lazy" className="w-full h-[400px] object-cover" onError={() => setMapError(true)} />
        </div>
      ) : mapError ? (
        <div className="flex flex-col items-center justify-center h-[200px] bg-muted/30 rounded-lg text-muted-foreground">
          <AlertCircle className="h-8 w-8 mb-2" /><p className="text-sm"><T k="literal.schedule.could_not_load_map.483f61e1" /></p>
        </div>
      ) : (
        <div className="text-center text-muted-foreground p-4 bg-muted/30 rounded-lg">
          <MapPin className="h-10 w-10 mx-auto mb-2 opacity-60" /><p className="text-sm"><T k="literal.schedule.no_map_available.be98ce00" /></p>
        </div>
      )}
      {pointsForMap.length > 0 && (
        <div className="text-xs text-center text-muted-foreground">
          <a
            href={`https://www.google.com/maps/dir/${pointsForMap.map((point) => `${point.latitude},${point.longitude}`).join("/")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center justify-center gap-1"
          >
            <Map className="h-3 w-3" /> <T k="literal.schedule.open_trajectory_in_google_maps.1cd6c763" />
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
}) => {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<StatusType | null>(null);
  const { data: statusHistory, isLoading: historyLoading } = useJobStatusHistory(jobId);
  const trackStatus = useTrackJobStatus();
  const triggerOnly = canOnlyTriggerStatus(userRole);
  const canEdit = canEditStatusManually(userRole);
  const canTrackStatus = Boolean(staffId && (canEdit || triggerOnly));

  const handleTriggerStatus = (statusType: StatusType) => {
    if (!staffId) {
      toast.error("Your login is not linked to an active staff member.");
      return;
    }
    setLoadingStatus(statusType);
    trackStatus.mutate({ jobId, statusType, staffId, isManualEdit: false }, {
      onSettled: () => setLoadingStatus(null),
    });
  };

  const statusConfig: Array<{ type: StatusType; label: string; icon: React.ReactNode; time: string | null }> = [
    { type: "on_our_way", label: "On the Way", icon: <span className="text-base">🚗</span>, time: onOurWayTime },
    { type: "cleaning_now", label: "Cleaning Now", icon: <span className="text-base">🏠</span>, time: timeStarted },
    { type: "cleaning_done", label: "Completed", icon: <span className="text-base">✓</span>, time: timeFinished },
  ];

  const getStatusIndex = () => {
    if (timeFinished) return 3;
    if (timeStarted) return 2;
    if (onOurWayTime) return 1;
    if (currentStatus === "completed") return 3;
    if (currentStatus === "in-progress") return 2;
    if (currentStatus === "on-the-way") return 1;
    return 0;
  };
  const currentIndex = getStatusIndex();

  return (
    <Card className="shadow-sm">
      <CardHeader className="py-2 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4" /><T k="literal.schedule.gps_tracking.d89629d2" /></CardTitle>
          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2"><History className="h-3 w-3 mr-1" /><span className="text-xs"><T k="literal.schedule.history.90ccd649" /></span></Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Map className="h-5 w-5" /><T k="literal.schedule.gps_map.154ba1bb" /></DialogTitle>
                <DialogDescription><T k="literal.schedule.shows_the_position_captured_at_the_time_of_s.dc66f397" /></DialogDescription>
              </DialogHeader>
              <GPSMapView statusHistory={statusHistory || []} isLoading={historyLoading} jobAddress={jobAddress ?? null} />
            </DialogContent>
          </Dialog>
        </div>
        {triggerOnly && <div className="flex items-center gap-2 text-xs text-amber-600 mt-1"><AlertCircle className="h-3 w-3" /><span><T k="literal.schedule.your_profile_can_only_mark_steps.c7713dcd" /></span></div>}
        {!staffId && <div className="flex items-center gap-2 text-xs text-destructive mt-1"><AlertCircle className="h-3 w-3" /><span><T k="literal.schedule.link_this_login_email_to_an_active_staff_mem.7b5112bf" /></span></div>}
      </CardHeader>
      {canTrackStatus && (
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
                disabled={!staffId || index > currentIndex}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default JobStatusTracker;
