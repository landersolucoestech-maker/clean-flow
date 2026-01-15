import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MapPin, Clock, User, ChevronLeft, ChevronRight, Loader2, Users, CalendarDays, AlertTriangle } from "lucide-react";
import { useJobs, useUpdateJob, useDeleteJob } from "@/hooks/useJobs";
import { useCustomers } from "@/hooks/useCustomers";
import { useJobGpsAlerts } from "@/hooks/useJobGpsAlerts";
import { AppointmentModal } from "@/components/schedule/AppointmentModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";

const ITEMS_PER_PAGE = 3;

// Helper to format time to 12-hour
const formatTimeTo12Hour = (time24: string | null | undefined): string => {
  if (!time24) return "";
  const match = time24.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return time24;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = hours >= 12 ? "PM" : "AM";
  if (hours === 0) hours = 12;
  else if (hours > 12) hours -= 12;
  return `${hours}:${minutes} ${period}`;
};

// Helper to parse duration to minutes
function parseDurationToMinutes(value: string): number | null {
  const s = value.trim().toLowerCase();
  if (!s) return null;
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const hhmm = s.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) {
    const h = parseInt(hhmm[1], 10);
    const m = parseInt(hhmm[2], 10);
    return h * 60 + m;
  }
  const hoursMatch = s.match(/(\d+(?:\.\d+)?)\s*h/);
  const minutesMatch = s.match(/(\d+)\s*(m|min)/);
  let total = 0;
  if (hoursMatch) total += Math.round(parseFloat(hoursMatch[1]) * 60);
  if (minutesMatch) total += parseInt(minutesMatch[1], 10);
  return total > 0 ? total : null;
}

export function UpcomingJobs() {
  const navigate = useNavigate();
  const { data: jobs = [], isLoading } = useJobs();
  const { data: customers = [] } = useCustomers();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();
  const { t, language } = useLanguage();
  
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"view" | "edit">("view");
  const [editJobData, setEditJobData] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Get day name translation
  const getDayName = (date: Date) => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayKey = dayNames[date.getDay()];
    return t(`days.${dayKey}`);
  };

  // Build customer lookup map
  const customersByName = useMemo(() => {
    return new Map(customers.map((c) => [c.name.toLowerCase(), c.id]));
  }, [customers]);

  // Filter and sort upcoming jobs (scheduled or in-progress, from today onwards)
  const upcomingJobs = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return jobs
      .filter(job => {
        if (!job.scheduled_date) return false;
        const jobDate = new Date(job.scheduled_date);
        jobDate.setHours(0, 0, 0, 0);
        return jobDate >= today && job.status !== 'completed' && job.status !== 'cancelled';
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time || '00:00'}`);
        const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time || '00:00'}`);
        return dateA.getTime() - dateB.getTime();
      })
      .map(job => {
        const jobDate = new Date(job.scheduled_date!);
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        const tomorrow = new Date(todayDate);
        tomorrow.setDate(tomorrow.getDate() + 1);

        let dateLabel = getDayName(jobDate);
        if (jobDate.getTime() === todayDate.getTime()) {
          dateLabel = t("upcomingJobs.today");
        } else if (jobDate.getTime() === tomorrow.getTime()) {
          dateLabel = t("upcomingJobs.tomorrow");
        }

        const timeLabel = formatTimeTo12Hour(job.scheduled_time);
        const staffArray = job.staff_assigned || [];
        const unassignedLabel = t("upcomingJobs.unassigned");

        // Build appointment object matching AppointmentModal format
        return {
          id: job.id,
          time: job.scheduled_time || "",
          customer: job.customer?.name || "Unknown",
          address: job.address || "",
          service: job.service_type || job.title || "",
          staff: staffArray[0] || "",
          staffAssigned: staffArray,
          status: job.status || "scheduled",
          duration: job.duration_text || (job.duration_minutes != null ? `${job.duration_minutes} min` : ""),
          date: job.scheduled_date || "",
          team: staffArray.join(", ") || "",
          amount: job.amount,
          notes: job.notes || "",
          additionalNotes: job.additional_notes || "",
          feedback: job.feedback || "",
          timeStarted: formatTimeTo12Hour(job.time_started),
          timeFinished: formatTimeTo12Hour(job.time_finished),
          onOurWayTime: formatTimeTo12Hour(job.on_our_way_time),
          paymentMethod: job.customer?.payment_method || "",
          // Extra display fields
          displayDate: dateLabel,
          displayTime: timeLabel,
          formattedDate: format(jobDate, 'MM/dd/yyyy'),
          cleaners: staffArray.length > 0 ? staffArray : [unassignedLabel],
          type: job.service_type || job.title || "Cleaning",
          priority: job.status === 'in-progress' ? 'high' : 'normal',
          // Keep raw job for edit
          rawJob: job,
        };
      });
  }, [jobs, t, language]);

  // Fetch GPS alerts for all upcoming jobs
  const jobIds = useMemo(() => upcomingJobs.map(j => j.id), [upcomingJobs]);
  const { data: gpsAlertsMap } = useJobGpsAlerts(jobIds);

  const totalPages = Math.max(1, Math.ceil(upcomingJobs.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedJobs = upcomingJobs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleViewDetails = (job: any) => {
    setSelectedAppointment(job);
    setModalMode("view");
    setEditJobData(null);
    setModalOpen(true);
  };

  const handleRequestEdit = (appointment: any) => {
    // Find the raw job data
    const rawJob = upcomingJobs.find(j => j.id === appointment.id)?.rawJob;
    if (!rawJob) return;

    const staffArray = rawJob.staff_assigned || [];
    
    // Format time correctly
    const formatTime = (time: string | null | undefined): string => {
      if (!time) return "";
      const match = time.match(/^(\d{1,2}):(\d{2})/);
      if (match) {
        return `${match[1].padStart(2, '0')}:${match[2]}`;
      }
      return time;
    };

    setEditJobData({
      id: rawJob.id,
      customer: rawJob.customer?.name || "",
      service: rawJob.service_type || rawJob.title || "",
      date: rawJob.scheduled_date || new Date().toISOString().split("T")[0],
      time: formatTime(rawJob.scheduled_time),
      staff1: staffArray[0] || "",
      staff2: staffArray[1] || "",
      staff3: staffArray[2] || "",
      staff4: staffArray[3] || "",
      status: rawJob.status || "scheduled",
      duration: rawJob.duration_text || (rawJob.duration_minutes != null ? `${rawJob.duration_minutes} min` : ""),
      amount: rawJob.amount != null ? String(rawJob.amount) : "",
      address: rawJob.address || "",
      notes: rawJob.notes || "",
      additionalNotes: rawJob.additional_notes || "",
    });
    setSelectedAppointment(appointment);
    setModalMode("edit");
    setModalOpen(true);
  };

  const handleUpdateJob = (payload: {
    id: string;
    customer: string;
    address: string;
    serviceType: string;
    amount: number;
    date: string;
    time: string;
    staffMembers: string[];
    status: string;
    duration: string;
    notes: string;
    additionalNotes: string;
  }) => {
    const customerId = customersByName.get(payload.customer.toLowerCase());
    if (!customerId) {
      return;
    }

    updateJob.mutate({
      id: payload.id,
      customer_id: customerId,
      title: payload.serviceType || "Job",
      service_type: payload.serviceType || undefined,
      scheduled_date: payload.date || undefined,
      scheduled_time: payload.time || undefined,
      staff_assigned: payload.staffMembers,
      status: payload.status || "scheduled",
      duration_text: payload.duration || undefined,
      duration_minutes: parseDurationToMinutes(payload.duration) ?? undefined,
      amount: payload.amount,
      address: payload.address || undefined,
      notes: payload.notes || undefined,
      additional_notes: payload.additionalNotes || undefined,
    });
  };

  const handleDeleteJob = (jobId: string) => {
    deleteJob.mutate(jobId);
  };

  const handleViewAll = () => {
    navigate("/schedule");
  };

  if (isLoading) {
    return (
      <Card className="transition-all duration-200 hover:shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">{t("upcomingJobs.title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="transition-all duration-200 hover:shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">{t("upcomingJobs.title")}</CardTitle>
          <Button variant="outline" size="sm" onClick={handleViewAll}>
            {t("common.viewAll")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {paginatedJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t("upcomingJobs.noJobs")}</p>
            </div>
          ) : (
            paginatedJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-4 bg-surface-muted rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-foreground truncate">{job.customer}</h4>
                      {gpsAlertsMap?.has(job.id) && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs">
                                <AlertTriangle className="w-3 h-3" />
                                <span>{gpsAlertsMap.get(job.id)?.distance_from_job}m</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("upcomingJobs.gpsAlert")}: {gpsAlertsMap.get(job.id)?.distance_from_job}m {t("upcomingJobs.fromJobAddress")}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <Badge
                      variant={job.priority === "high" ? "destructive" : "secondary"}
                      className="text-xs ml-2 flex-shrink-0"
                    >
                      {job.type}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{job.address || t("upcomingJobs.noAddress")}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CalendarDays className="w-3 h-3 flex-shrink-0" />
                      <span>{job.displayDate} - {job.formattedDate}</span>
                      <span className="text-muted-foreground/60">•</span>
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span>{job.displayTime || 'TBD'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="w-3 h-3 flex-shrink-0" />
                      <span>{job.cleaners.map((c, i) => `${t("upcomingJobs.team")} ${c}`).join(", ")}</span>
                    </div>
                  </div>
                </div>
                
                <div className="ml-4 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => handleViewDetails(job)}>
                    {t("common.viewDetails")}
                  </Button>
                </div>
              </div>
            ))
          )}
          
          {/* Pagination at bottom */}
          {upcomingJobs.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-center gap-1 pt-4 border-t border-border">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                {currentPage}/{totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Use the same AppointmentModal as Schedule page */}
      <AppointmentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        appointment={selectedAppointment}
        mode={modalMode}
        editJobData={editJobData}
        onJobUpdated={handleUpdateJob}
        onJobDeleted={handleDeleteJob}
        onRequestEdit={handleRequestEdit}
      />
    </>
  );
}
