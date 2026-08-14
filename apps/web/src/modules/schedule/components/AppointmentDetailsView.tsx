import { useMemo, useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useUpdateJobFields } from "@/hooks/useJobs";
import { useAutoGenerateInvoice } from "@/hooks/useInvoices";
import { useQuickBooks } from "@/hooks/useQuickBooks";
import { useQuickBooksStore } from "@/stores/quickbooks.store";
import { JobStatusTracker } from "./JobStatusTracker";
import { ReviewRequestPreviewModal } from "./ReviewRequestPreviewModal";
import { AppointmentBillingSummary } from "./AppointmentBillingSummary";
import { AppointmentManualTimeEditor } from "./AppointmentManualTimeEditor";
import { AppointmentNotesSections } from "./AppointmentNotesSections";
import { Dot, IconBubble, InfoCell, TeamWithMembers } from "./AppointmentDetailsPrimitives";
import { getAppointmentStatusConfig } from "../utils/appointmentStatus";
import type { AppointmentDetailsAppointment, JobNote } from "../types/appointmentDetails";
import { canEditStatusManually } from "@/hooks/useJobStatusTracking";
import { useCurrentStaff } from "@/hooks/useStaff";
import { useSendNotificationSMS } from "@/hooks/useSendNotificationSMS";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import {
  Calendar as CalendarIcon,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  MapPin,
  Navigation,
  Pencil,
  Play,
  Plus,
  Send,
  Square,
  Star,
  Timer,
  Trash2,
  Users,
  X,
  AlertCircle,
} from "lucide-react";

export function AppointmentDetailsView({
  appointment,
  onClose,
  onOpenInvoice,
  onEdit,
}: {
  appointment: AppointmentDetailsAppointment;
  onClose: () => void;
  onOpenInvoice: () => void;
  onEdit?: () => void;
}) {
  const updateJobFields = useUpdateJobFields();
  const autoGenerateInvoice = useAutoGenerateInvoice();
  const { isConnected: qbConnected } = useQuickBooks();
  const { customerMapping } = useQuickBooksStore();
  const sendNotification = useSendNotificationSMS();
  const { data: companySettings } = useCompanySettings();
  const { data: currentStaff } = useCurrentStaff();
  const currentUserRole = currentStaff?.staff_roles?.role ?? "unauthorized";
  const canManuallyEditTime = canEditStatusManually(currentUserRole);
  
  const [notesPage, setNotesPage] = useState(1);
  const [additionalNotesPage, setAdditionalNotesPage] = useState(1);
  const [notes, setNotes] = useState<JobNote[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState<JobNote[]>([]);
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [addAdditionalNoteOpen, setAddAdditionalNoteOpen] = useState(false);
  const [addFeedbackOpen, setAddFeedbackOpen] = useState(false);
  const [reviewPreviewOpen, setReviewPreviewOpen] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [jobNotesExpanded, setJobNotesExpanded] = useState(true);
  const [additionalNotesExpanded, setAdditionalNotesExpanded] = useState(true);
  const [feedbackExpanded, setFeedbackExpanded] = useState(true);
  const [feedbackList, setFeedbackList] = useState<{ id: string; text: string; author: string; date: string }[]>([]);

  // Sync notes from appointment data when it changes
  useEffect(() => {
    if (appointment.notes) {
      setNotes([{ id: "n1", text: appointment.notes, author: "Job Notes" }]);
    } else {
      setNotes([]);
    }
  }, [appointment.notes]);

  useEffect(() => {
    if (appointment.additionalNotes) {
      setAdditionalNotes([{ id: "an1", text: appointment.additionalNotes, author: "Additional Notes" }]);
    } else {
      setAdditionalNotes([]);
    }
  }, [appointment.additionalNotes]);

  // Sync feedback from appointment data
  useEffect(() => {
    if (appointment.feedback) {
      setFeedbackList([{ id: "f1", text: appointment.feedback, author: "Feedback", date: "" }]);
    } else {
      setFeedbackList([]);
    }
  }, [appointment.feedback]);

  // Time editing states - initialize from appointment data
  const [editingTime, setEditingTime] = useState<string | null>(null);
  const [timeValues, setTimeValues] = useState({
    onOurWay: appointment.onOurWayTime || "",
    jobStarted: appointment.timeStarted || "",
    jobFinished: appointment.timeFinished || "",
  });
  const [tempTimeValue, setTempTimeValue] = useState("");

  // Sync time values when appointment changes
  useEffect(() => {
    setTimeValues({
      onOurWay: appointment.onOurWayTime || "",
      jobStarted: appointment.timeStarted || "",
      jobFinished: appointment.timeFinished || "",
    });
  }, [appointment.id, appointment.onOurWayTime, appointment.timeStarted, appointment.timeFinished]);

  const notesTotalPages = Math.ceil(notes.length / 3) || 1;
  const displayedNotes = notes.slice((notesPage - 1) * 3, notesPage * 3);

  const additionalNotesTotalPages = Math.ceil(additionalNotes.length / 3) || 1;
  const displayedAdditionalNotes = additionalNotes.slice((additionalNotesPage - 1) * 3, additionalNotesPage * 3);

  // Calculate cleaning time total based on jobStarted and jobFinished
  const cleaningTimeTotal = useMemo(() => {
    const parseTime = (timeStr: string): Date | null => {
      const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) return null;
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const period = match[3].toUpperCase();
      if (period === "PM" && hours !== 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    };

    const start = parseTime(timeValues.jobStarted);
    const end = parseTime(timeValues.jobFinished);

    if (!start || !end) return "—";

    let diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000; // handle overnight

    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) return `${minutes}min`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}min`;
  }, [timeValues.jobStarted, timeValues.jobFinished]);

  const headerAddress = useMemo(() => {
    return appointment.address;
  }, [appointment.address]);

  // Helper to convert AM/PM time to 24-hour format for database
  const convertTo24Hour = (timeStr: string): string | null => {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  const handleAddNote = () => {
    if (!newNoteText.trim()) {
      toast.error("Please enter a note");
      return;
    }
    const newNote: JobNote = {
      id: `n${Date.now()}`,
      text: newNoteText.trim(),
      author: "Current User",
    };
    const updatedNotes = [...notes, newNote];
    setNotes(updatedNotes);
    
    // Save to database - combine all notes into a single string
    const allNotesText = updatedNotes.map(n => n.text).join("\n\n");
    updateJobFields.mutate({ 
      id: String(appointment.id), 
      notes: allNotesText 
    }, {
      onSuccess: () => toast.success("Note added successfully"),
      onError: () => toast.error("Failed to save note"),
    });
    
    setNewNoteText("");
    setAddNoteOpen(false);
  };

  const handleAddAdditionalNote = () => {
    if (!newNoteText.trim()) {
      toast.error("Please enter a note");
      return;
    }
    const newNote: JobNote = {
      id: `an${Date.now()}`,
      text: newNoteText.trim(),
      author: "Current User",
    };
    const updatedNotes = [...additionalNotes, newNote];
    setAdditionalNotes(updatedNotes);
    
    // Save to database
    const allNotesText = updatedNotes.map(n => n.text).join("\n\n");
    updateJobFields.mutate({ 
      id: String(appointment.id), 
      additional_notes: allNotesText 
    }, {
      onSuccess: () => toast.success("Additional note added"),
      onError: () => toast.error("Failed to save note"),
    });
    
    setNewNoteText("");
    setAddAdditionalNoteOpen(false);
  };

  const handleDeleteAdditionalNote = (id: string) => {
    const updatedNotes = additionalNotes.filter((n) => n.id !== id);
    setAdditionalNotes(updatedNotes);
    
    // Save to database
    const allNotesText = updatedNotes.length > 0 ? updatedNotes.map(n => n.text).join("\n\n") : null;
    updateJobFields.mutate({ 
      id: String(appointment.id), 
      additional_notes: allNotesText 
    }, {
      onSuccess: () => toast.success("Additional note deleted"),
      onError: () => toast.error("Failed to delete note"),
    });
  };

  const handleDeleteNote = (id: string) => {
    const updatedNotes = notes.filter((n) => n.id !== id);
    setNotes(updatedNotes);
    
    // Save to database
    const allNotesText = updatedNotes.length > 0 ? updatedNotes.map(n => n.text).join("\n\n") : null;
    updateJobFields.mutate({ 
      id: String(appointment.id), 
      notes: allNotesText 
    }, {
      onSuccess: () => toast.success("Note deleted"),
      onError: () => toast.error("Failed to delete note"),
    });
  };

  const handleAddFeedback = () => {
    if (!newNoteText.trim()) {
      toast.error("Please enter feedback");
      return;
    }
    const newFeedback = {
      id: `f${Date.now()}`,
      text: newNoteText.trim(),
      author: "Current User",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };
    const updatedFeedback = [...feedbackList, newFeedback];
    setFeedbackList(updatedFeedback);
    
    // Save to database - combine all feedback into a single string
    const allFeedbackText = updatedFeedback.map(f => f.text).join("\n\n");
    updateJobFields.mutate({ 
      id: String(appointment.id), 
      feedback: allFeedbackText 
    }, {
      onSuccess: () => toast.success("Feedback added successfully"),
      onError: () => toast.error("Failed to save feedback"),
    });
    
    setNewNoteText("");
    setAddFeedbackOpen(false);
  };

  const handleDeleteFeedback = (id: string) => {
    const updatedFeedback = feedbackList.filter((f) => f.id !== id);
    setFeedbackList(updatedFeedback);
    
    // Save to database
    const allFeedbackText = updatedFeedback.length > 0 ? updatedFeedback.map(f => f.text).join("\n\n") : null;
    updateJobFields.mutate({ 
      id: String(appointment.id), 
      feedback: allFeedbackText 
    }, {
      onSuccess: () => toast.success("Feedback deleted"),
      onError: () => toast.error("Failed to delete feedback"),
    });
  };

  const handleOpenReviewPreview = () => {
    setReviewPreviewOpen(true);
  };

  const handleSendReview = (message: string) => {
    // Send SMS and log to conversation if customer has phone and ID
    if (appointment.customerId && appointment.customerPhone) {
      sendNotification.mutate({
        customerId: appointment.customerId,
        customerPhone: appointment.customerPhone,
        customerName: appointment.customer,
        message,
        notificationType: "review_request",
        showToast: true,
      }, {
        onSuccess: () => {
          setReviewPreviewOpen(false);
        },
        onError: (error) => {
          console.error("Review notification error:", error);
        },
      });
    } else {
      toast.error("Review request was not sent", {
        description: "This customer needs a saved phone number first.",
      });
    }
  };

  const handleSendInvoice = () => {
    onOpenInvoice();
  };

  const handleEditTime = (key: string, currentValue: string) => {
    setEditingTime(key);
    setTempTimeValue(currentValue);
  };

  const parseTimeToMinutes = (timeStr: string): number | null => {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const handleSaveTime = () => {
    if (!editingTime || !tempTimeValue.trim()) {
      setEditingTime(null);
      setTempTimeValue("");
      return;
    }

    const newValue = tempTimeValue.trim();
    const parsedNew = parseTimeToMinutes(newValue);

    if (parsedNew === null) {
      toast.error("Invalid time format. Use format like 7:30 AM");
      return;
    }

    // Validate Job Finished is after Job Started
    if (editingTime === "jobFinished") {
      const startMinutes = parseTimeToMinutes(timeValues.jobStarted);
      if (startMinutes !== null && parsedNew <= startMinutes) {
        toast.error("Job Finished must be after Job Started");
        return;
      }
    }

    // Validate Job Started is before Job Finished
    if (editingTime === "jobStarted") {
      const endMinutes = parseTimeToMinutes(timeValues.jobFinished);
      if (endMinutes !== null && parsedNew >= endMinutes) {
        toast.error("Job Started must be before Job Finished");
        return;
      }
    }

    setTimeValues((prev) => ({
      ...prev,
      [editingTime]: newValue,
    }));
    
    // Convert to 24-hour format for database
    const time24 = convertTo24Hour(newValue);
    
    // Save to database and update status based on which time was set
    const updateData: { 
      id: string; 
      on_our_way_time?: string | null; 
      time_started?: string | null; 
      time_finished?: string | null; 
      status?: string;
    } = { id: String(appointment.id) };
    
    if (editingTime === "onOurWay") {
      updateData.on_our_way_time = time24;
      // Change status to on-the-way when on our way is set
      updateData.status = "on-the-way";
    } else if (editingTime === "jobStarted") {
      updateData.time_started = time24;
      // Change status to in-progress when cleaning starts
      updateData.status = "in-progress";
    } else if (editingTime === "jobFinished") {
      updateData.time_finished = time24;
      // Change status to completed when cleaning is done
      updateData.status = "completed";
    }
    
    updateJobFields.mutate(updateData, {
      onSuccess: () => {
        const statusMessage =
          editingTime === "jobFinished"
            ? "Time updated and job marked as Cleaning Done"
            : editingTime === "jobStarted"
              ? "Time updated and job marked as Cleaning Now"
              : editingTime === "onOurWay"
                ? "Time updated and job marked as On Our Way"
                : "Time updated";
        toast.success(statusMessage);
        
        // Auto-generate invoice when job is marked as completed
        if (editingTime === "jobFinished") {
          const jobId = String(appointment.id);
          autoGenerateInvoice.mutate({
            jobId,
            qbCustomerId: qbConnected && appointment.customerId
              ? customerMapping[appointment.customerId]
              : undefined,
          });
        }
      },
      onError: () => toast.error("Failed to save time"),
    });
    
    setEditingTime(null);
    setTempTimeValue("");
  };

  const handleCancelEditTime = () => {
    setEditingTime(null);
    setTempTimeValue("");
  };

  // Clear a specific time field and recalculate status
  const handleClearTime = (key: "onOurWay" | "jobStarted" | "jobFinished") => {
    // Update local state
    const newTimeValues = { ...timeValues, [key]: "" };
    setTimeValues(newTimeValues);

    // Determine the new status based on remaining times
    let newStatus = "scheduled";
    if (newTimeValues.jobFinished) {
      newStatus = "completed";
    } else if (newTimeValues.jobStarted) {
      newStatus = "in-progress";
    } else if (newTimeValues.onOurWay) {
      newStatus = "on-the-way";
    }

    // Build update data
    const updateData: {
      id: string;
      on_our_way_time?: string | null;
      time_started?: string | null;
      time_finished?: string | null;
      status: string;
    } = { id: String(appointment.id), status: newStatus };

    if (key === "onOurWay") {
      updateData.on_our_way_time = null;
    } else if (key === "jobStarted") {
      updateData.time_started = null;
    } else if (key === "jobFinished") {
      updateData.time_finished = null;
    }

    updateJobFields.mutate(updateData, {
      onSuccess: () => {
        const labelMap = {
          onOurWay: "On Our Way",
          jobStarted: "Cleaning Now",
          jobFinished: "Cleaning Done",
        };
        toast.success(`${labelMap[key]} cleared`);
      },
      onError: () => toast.error("Failed to clear time"),
    });
  };

  const statusConfig = getAppointmentStatusConfig(appointment.status);
  const StatusIcon = statusConfig.icon;

  return (
    <>
      <div className="bg-surface">
        <header className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{appointment.customer}</h2>
          <span className="text-xs text-muted-foreground font-mono">Job ID: {String(appointment.id).slice(0, 8)}</span>
          <Badge className={`${statusConfig.colorClass} border text-xs font-semibold px-3 py-1 gap-1.5 flex items-center`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {statusConfig.label}
          </Badge>
        </header>

        <main className="px-5 py-4 space-y-4">
          {/* Top info (3 rows x 2 cols) */}
          <section aria-label="Appointment summary" className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <InfoCell icon={<MapPin className="h-4 w-4" />} label="Address" value={headerAddress || "No address"} />
              <InfoCell
                icon={<DollarSign className="h-4 w-4" />}
                label="Amount"
                value={
                  <span className="text-sm font-semibold text-foreground">
                    {appointment.amount != null && appointment.amount !== "" 
                      ? `$${Number(appointment.amount).toFixed(2)}` 
                      : "Not set"}
                  </span>
                }
              />

              <InfoCell
                icon={<FileText className="h-4 w-4" />}
                label="Service Type"
                value={appointment.service || "Not specified"}
              />

              <InfoCell
                icon={<CalendarIcon className="h-4 w-4" />}
                label="Date and Time"
                value={appointment.date ? new Date(appointment.date + "T00:00:00").toLocaleDateString("en-US", { 
                  weekday: "long", 
                  month: "long", 
                  day: "numeric",
                  year: "numeric"
                }) : "Not scheduled"}
                value2={appointment.time || "No time set"}
              />

              <div className="flex items-start gap-3 min-w-0">
                <IconBubble>
                  <Users className="h-4 w-4" />
                </IconBubble>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Team Assigned</p>
                  <div className="mt-1 space-y-3">
                    {appointment.team && appointment.team.trim() ? (
                      Array.from(
                        new Set(
                          appointment.team
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean)
                        )
                      ).map((teamNum) => {
                        const teamColors: Record<string, string> = {
                          "1": "bg-blue-600",
                          "2": "bg-purple-600",
                          "3": "bg-emerald-600",
                          "4": "bg-red-600",
                          "5": "bg-amber-600",
                          "6": "bg-cyan-600",
                        };
                        const color = teamColors[teamNum] || "bg-gray-500";
                        return (
                          <TeamWithMembers key={teamNum} teamNum={teamNum} color={color} />
                        );
                      })
                    ) : (
                      <span className="text-sm text-muted-foreground">No team assigned</span>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 h-8 rounded-full px-3 text-xs gap-1.5 shadow-none"
                    onClick={handleOpenReviewPreview}
                  >
                    <Star className="h-4 w-4" />
                    Request Review
                  </Button>
                </div>
              </div>

              {/* Duration */}
              <InfoCell
                icon={<Timer className="h-4 w-4" />}
                label="Duration"
                value={appointment.duration || "Not set"}
              />
            </div>
          </section>

          <Separator />

          <AppointmentNotesSections
            notes={notes}
            additionalNotes={additionalNotes}
            feedbackList={feedbackList}
            jobNotesExpanded={jobNotesExpanded}
            additionalNotesExpanded={additionalNotesExpanded}
            feedbackExpanded={feedbackExpanded}
            onToggleJobNotes={() => setJobNotesExpanded((value) => !value)}
            onToggleAdditionalNotes={() => setAdditionalNotesExpanded((value) => !value)}
            onToggleFeedback={() => setFeedbackExpanded((value) => !value)}
            onAddJobNote={() => setAddNoteOpen(true)}
            onAddAdditionalNote={() => setAddAdditionalNoteOpen(true)}
            onAddFeedback={() => setAddFeedbackOpen(true)}
            onDeleteJobNote={handleDeleteNote}
            onDeleteAdditionalNote={handleDeleteAdditionalNote}
            onDeleteFeedback={handleDeleteFeedback}
          />

          <Separator />

          {/* GPS Status Tracker with Permissions */}
          <section aria-label="GPS Status Tracking" className="space-y-3">
            <JobStatusTracker
              jobId={String(appointment.id)}
              currentStatus={appointment.status}
              onOurWayTime={appointment.onOurWayTime || null}
              timeStarted={appointment.timeStarted || null}
              timeFinished={appointment.timeFinished || null}
              staffId={currentStaff?.id ?? null}
              userRole={currentUserRole}
              jobAddress={appointment.address || null}
              customerId={appointment.customerId}
              customerPhone={appointment.customerPhone}
              customerName={appointment.customer}
              jobDate={appointment.date}
            />
          </section>

          {canManuallyEditTime && (
            <>
              <Separator />
              <AppointmentManualTimeEditor
                cleaningTimeTotal={cleaningTimeTotal}
                timeValues={timeValues}
                editingTime={editingTime}
                tempTimeValue={tempTimeValue}
                onTempTimeChange={setTempTimeValue}
                onSave={handleSaveTime}
                onCancel={handleCancelEditTime}
                onEdit={handleEditTime}
                onClear={handleClearTime}
              />
            </>
          )}

          <Separator />

          {/* Pricing + statuses */}
          <AppointmentBillingSummary amount={appointment.amount} onSendInvoice={handleSendInvoice} />
        </main>

        <footer className="flex justify-end gap-2 px-5 py-3 bg-surface-muted border-t border-border">
          {onEdit && (
            <Button
              variant="hero"
              size="sm"
              className="h-8 rounded-full px-4 text-xs shadow-none gap-1.5"
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-full px-4 text-xs shadow-none"
            onClick={onClose}
          >
            Close
          </Button>
        </footer>
      </div>

      {/* Add Job Note Modal */}
      <Dialog open={addNoteOpen} onOpenChange={setAddNoteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Job Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Enter your note here..."
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddNoteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNote}>Add Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Additional Note Modal */}
      <Dialog open={addAdditionalNoteOpen} onOpenChange={setAddAdditionalNoteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Additional Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Enter additional note here..."
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddAdditionalNoteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAdditionalNote}>Add Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Feedback Modal */}
      <Dialog open={addFeedbackOpen} onOpenChange={setAddFeedbackOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Enter customer feedback here..."
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFeedbackOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddFeedback}>Add Feedback</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Request Preview Modal */}
      <ReviewRequestPreviewModal
        open={reviewPreviewOpen}
        onClose={() => setReviewPreviewOpen(false)}
        onSend={handleSendReview}
        customerName={appointment.customer}
        companyName={companySettings?.trade_name || companySettings?.legal_name || "Our Company"}
        googleReviewUrl={companySettings?.google_review_url || undefined}
        nextdoorReviewUrl={companySettings?.nextdoor_review_url || undefined}
        isSending={sendNotification.isPending}
      />
    </>
  );
}
