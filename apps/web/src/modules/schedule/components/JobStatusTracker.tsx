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
  Map,
} from "lucide-react";
import { format } from "date-fns";
import {
  useJobStatusHistory,
  useTrackJobStatus,
  StatusType,
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
  if (!Number.isNaN(isoDate.getTime())) {
    return format(isoDate, "MM/dd/yyyy 'at' hh:mm:ss a");
  }
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
  <div className={`relative p-3 rounded-lg border-2 transition-all ${
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

  const hasAnyHistory = statusHistory.length > 0;

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

    if (pointsForMap.length > 0 || jobAddress) {
      void fetchMapUrl();
    } else {
      setMapUrl(null);
      setMapLoading(false);
    }

    return () => {
      active = false;
    };
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
            href={`https://www.google.com/maps/dir/${pointsForMap.map((point) => `${point.latitude},${point.longitude}`).join("/")}`}
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
  const { data: statusHistory = [], isLoading: historyLoading } = useJobStatusHistory(jobId);
  const trackStatus = useTrackJobStatus();
  const [activeStatus, setActiveStatus] = useState<StatusType | null>(null);

  const triggerStatus = async (statusType: StatusType) => {
    setActiveStatus(statusType);
    try {
      await trackStatus.mutateAsync({
        jobId,
        statusType,
        staffId,
        customerId,
        customerPhone,
        customerName,
        jobDate,
      });
      toast.success("Status updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update status");
    } finally {
      setActiveStatus(null);
    }
  };

  const canEdit = canEditStatusManually(userRole);
  const triggerOnly = canOnlyTriggerStatus(userRole);
  const statusSequence: Array<{
    type: StatusType;
    label: string;
    time: string | null;
    icon: React.ReactNode;
  }> = [
    { type: "on_our_way", label: "On Our Way", time: onOurWayTime, icon: <MapPin className="h-4 w-4" /> },
    { type: "started", label: "Started", time: timeStarted, icon: <Clock className="h-4 w-4" /> },
    { type: "finished", label: "Finished", time: timeFinished, icon: <CheckCircle2 className="h-4 w-4" /> },
  ];
  const completedIndex = statusSequence.reduce((last, item, index) => item.time ? index : last, -1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Job Status</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <History className="mr-2 h-4 w-4" /> History
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Status History</DialogTitle>
                <DialogDescription>GPS points and status transitions captured for this job.</DialogDescription>
              </DialogHeader>
              <GPSMapView statusHistory={statusHistory} isLoading={historyLoading} jobAddress={jobAddress} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          {statusSequence.map((item, index) => (
            <StatusButton
              key={item.type}
              statusType={item.type}
              label={item.label}
              icon={item.icon}
              currentTime={item.time}
              isActive={index === completedIndex + 1}
              isCompleted={Boolean(item.time)}
              onTrigger={() => void triggerStatus(item.type)}
              isLoading={trackStatus.isPending && activeStatus === item.type}
              disabled={!canEdit && !triggerOnly}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">Current: {currentStatus}</Badge>
          {triggerOnly && <Badge variant="secondary">Trigger-only role</Badge>}
        </div>
      </CardContent>
    </Card>
  );
};
