import { useState, useRef, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import type { Appointment as CalendarAppointment } from "@/components/calendar/CalendarGrid";
import { AppointmentModal } from "@/components/schedule/AppointmentModal";
import { FilterModal } from "@/components/schedule/FilterModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { Plus, Upload, Download, Loader2, Trash2, CheckSquare, X } from "lucide-react";
import { toast } from "sonner";
import { useCustomers } from "@/hooks/useCustomers";
import { useCleanersAndDrivers } from "@/hooks/useStaff";
import {
  useJobs,
  useImportJobs,
  useCreateJob,
  useUpdateJob,
  useDeleteJob,
  ImportedJobRow,
} from "@/hooks/useJobs";
import * as XLSX from "xlsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function parseAmountToNumber(value: string): number | null {
  const n = parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

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

export function Schedule() {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: jobsFromDb = [], isLoading } = useJobs();
  const { data: customers = [] } = useCustomers();
  const { data: staffMembers = [] } = useCleanersAndDrivers();

  const customersByName = useMemo(() => {
    return new Map(customers.map((c) => [c.name.toLowerCase(), c.id]));
  }, [customers]);

  const importJobs = useImportJobs();
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();

  // Helper to convert 24-hour time to 12-hour format for display
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

  // Convert database jobs to calendar appointment format with all real data
  const appointments = jobsFromDb.map((job) => ({
    id: job.id,
    time: job.scheduled_time || "",
    customer: job.customer?.name || "Unknown Customer",
    customerId: job.customer_id,
    customerPhone: job.customer?.phone || undefined,
    address: job.address || "",
    service: job.service_type || job.title || "",
    description: job.description || job.notes || "",
    title: job.title || "",
    staff: job.staff_assigned?.[0] || "",
    staffAssigned: job.staff_assigned || [],
    status: job.status || "scheduled",
    duration: job.duration_text || (job.duration_minutes != null ? `${job.duration_minutes} min` : ""),
    date: job.scheduled_date || "",
    team: job.staff_assigned?.join(", ") || "",
    amount: job.amount,
    notes: job.notes || "",
    additionalNotes: job.additional_notes || "",
    feedback: job.feedback || "",
    timeStarted: formatTimeTo12Hour(job.time_started),
    timeFinished: formatTimeTo12Hour(job.time_finished),
    onOurWayTime: formatTimeTo12Hour(job.on_our_way_time),
    paymentMethod: job.customer?.payment_method || "",
  }));

  const [appointmentModal, setAppointmentModal] = useState<{
    open: boolean;
    mode: "create" | "view" | "edit";
    appointment: CalendarAppointment | null;
    editJobData: {
      id: string;
      customer: string;
      service: string;
      date: string;
      time: string;
      team: string;
      status: string;
      duration: string;
      amount: string;
      address: string;
      notes: string;
      additionalNotes: string;
    } | null;
  }>({
    open: false,
    mode: "create",
    appointment: null,
    editJobData: null,
  });

  const [filterModal, setFilterModal] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const handleNewAppointment = () => {
    setAppointmentModal({
      open: true,
      mode: "create",
      appointment: null,
      editJobData: null,
    });
  };

  const handleViewAppointment = (appointment: CalendarAppointment) => {
    setAppointmentModal({
      open: true,
      mode: "view",
      appointment,
      editJobData: null,
    });
  };

  const handleEditJob = (appointment: CalendarAppointment) => {
    const jobId = String(appointment.id);
    const dbJob = jobsFromDb.find((j) => j.id === jobId);

    // Get all staff members from the database job or appointment
    const staffArray = dbJob?.staff_assigned || appointment.staffAssigned || [];
    
    // Format time correctly (remove seconds if present, handle HH:MM:SS format)
    const formatTime = (time: string | null | undefined): string => {
      if (!time) return "";
      // If time is in HH:MM:SS format, convert to HH:MM
      const match = time.match(/^(\d{1,2}):(\d{2})/);
      if (match) {
        return `${match[1].padStart(2, '0')}:${match[2]}`;
      }
      return time;
    };

    setAppointmentModal({
      open: true,
      mode: "edit",
      appointment,
      editJobData: {
        id: jobId,
        customer: dbJob?.customer?.name || appointment.customer || "",
        service: dbJob?.service_type || dbJob?.title || appointment.service || "",
        date: dbJob?.scheduled_date || appointment.date || new Date().toISOString().split("T")[0],
        time: formatTime(dbJob?.scheduled_time) || formatTime(appointment.time) || "",
        team: staffArray[0] || "",
        status: dbJob?.status || appointment.status || "scheduled",
        duration:
          dbJob?.duration_text || (dbJob?.duration_minutes != null ? `${dbJob.duration_minutes} min` : "") || appointment.duration || "",
        amount: dbJob?.amount != null ? String(dbJob.amount) : (appointment.amount != null ? String(appointment.amount) : ""),
        address: dbJob?.address || appointment.address || "",
        notes: dbJob?.notes || appointment.notes || "",
        additionalNotes: dbJob?.additional_notes || appointment.additionalNotes || "",
      },
    });
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
      toast.error("Customer not found. Please select an existing customer.");
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

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    setIsDeleting(true);
    const idsToDelete = Array.from(selectedIds);
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const id of idsToDelete) {
      try {
        await deleteJob.mutateAsync(id);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete job ${id}:`, error);
        errorCount++;
      }
    }
    
    if (deletedCount > 0) {
      toast.success(`${deletedCount} jobs deleted successfully`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to delete ${errorCount} jobs`);
    }
    
    setSelectedIds(new Set());
    setSelectionMode(false);
    setIsDeleting(false);
    setDeleteConfirmOpen(false);
  };

  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectedIds(new Set());
    }
    setSelectionMode(!selectionMode);
  };
  const handleApplyFilters = (filters: {
    staff: string[];
    services: string[];
    statuses: string[];
  }) => {
    toast.success(t("payroll.filterApplied"));
    console.log("Applied filters:", filters);
  };

  // Export jobs to Excel with all requested columns
  const handleExportExcel = () => {
    if (jobsFromDb.length === 0) {
      toast.error("No jobs to export.");
      return;
    }

    const exportData = jobsFromDb.map((job) => ({
      "Customer Name": job.customer?.name || "",
      "Service Type": job.service_type || job.title || "",
      "Address": job.address || "",
      "Job Notes": job.notes || "",
      "Additional Notes": job.additional_notes || "",
      "Feedback": job.feedback || "",
      "Scheduled Date": job.scheduled_date || "",
      "Scheduled Time": job.scheduled_time || "",
      "Staff Assigned": job.staff_assigned?.join(", ") || "",
      "Status": job.status || "",
      "Time Started": job.time_started || "",
      "Time Finished": job.time_finished || "",
      "Total Cleaning Time": job.duration_text || (job.duration_minutes != null ? `${job.duration_minutes} min` : ""),
      "Amount": job.amount != null ? Number(job.amount) : "",
      "Payment Status": job.payment_status || "Pending",
      "Invoice Status": job.invoice_status || "Not Generated"
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Jobs");

    worksheet["!cols"] = [
      { wch: 25 }, // Customer Name
      { wch: 20 }, // Service Type
      { wch: 40 }, // Address
      { wch: 30 }, // Job Notes
      { wch: 30 }, // Additional Notes
      { wch: 25 }, // Feedback
      { wch: 14 }, // Scheduled Date
      { wch: 14 }, // Scheduled Time
      { wch: 30 }, // Staff Assigned
      { wch: 14 }, // Status
      { wch: 12 }, // Time Started
      { wch: 12 }, // Time Finished
      { wch: 18 }, // Total Cleaning Time
      { wch: 10 }, // Amount
      { wch: 14 }, // Payment Status
      { wch: 14 }, // Invoice Status
    ];

    XLSX.writeFile(workbook, `schedule_jobs_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Jobs exported successfully!");
  };

  // Import jobs from Excel
  const handleImportExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<ImportedJobRow>(worksheet);

        if (jsonData.length === 0) {
          toast.error("No data found in the file.");
          return;
        }

        const firstRow = jsonData[0];
        const hasCustomer = Boolean(firstRow["Customer Name"]);
        const hasService = Boolean(firstRow["Service Type"] || firstRow["Title"]);

        if (!hasCustomer || !hasService) {
          toast.error("Invalid file format. 'Customer Name' and 'Service Type' are required.");
          return;
        }

        importJobs.mutate(jsonData);
      } catch (error) {
        console.error("Import error:", error);
        toast.error("Error importing file. Please check the format.");
      }
    };

    reader.readAsArrayBuffer(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 flex flex-col overflow-hidden p-6">
          {/* Page Header */}
          <div className="flex items-center justify-between shrink-0 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t("schedule.title")}</h1>
              <p className="text-muted-foreground">{t("schedule.subtitle")}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportExcel}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />

              {selectionMode ? (
                <>
                  <span className="text-sm text-muted-foreground">
                    {selectedIds.size} {t("common.selected") || "selected"}
                  </span>
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteConfirmOpen(true)}
                    disabled={selectedIds.size === 0 || isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    {t("common.delete")} ({selectedIds.size})
                  </Button>
                  <Button variant="outline" onClick={toggleSelectionMode}>
                    <X className="w-4 h-4 mr-2" />
                    {t("common.cancel")}
                  </Button>
                </>
              ) : (
                <>

                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importJobs.isPending}>
                    {importJobs.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t("common.importing")}
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        {t("common.import")}
                      </>
                    )}
                  </Button>

                  <Button variant="outline" onClick={handleExportExcel} disabled={isLoading}>
                    <Download className="w-4 h-4 mr-2" />
                    {t("common.exportExcel")}
                  </Button>

                  <Button variant="hero" size="lg" className="flex items-center space-x-2" onClick={handleNewAppointment}>
                    <Plus className="w-4 h-4" />
                    <span>{t("common.createJob")}</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Calendar */}
          <Card className="flex-1 overflow-hidden">
            <CardContent className="p-0 h-full">
              <CalendarGrid
                appointments={appointments}
                staffMembers={staffMembers}
                onAppointmentClick={selectionMode ? undefined : handleViewAppointment}
                onEditClick={selectionMode ? undefined : handleEditJob}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                selectionMode={selectionMode}
              />
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Modals */}
      {/* Get fresh appointment data from the appointments array */}
      {(() => {
        const currentAppointment = appointmentModal.appointment 
          ? appointments.find(a => a.id === appointmentModal.appointment?.id) || appointmentModal.appointment
          : null;
        
        return (
          <AppointmentModal
            open={appointmentModal.open}
            onOpenChange={(open) =>
              setAppointmentModal((prev) => ({
                ...prev,
                open,
              }))
            }
            appointment={currentAppointment}
            mode={appointmentModal.mode}
            editJobData={appointmentModal.editJobData}
            onJobCreated={(payload) => {
              const customerId = customersByName.get(payload.customer.toLowerCase());
              if (!customerId) {
                toast.error("Customer not found. Please select an existing customer.");
                return;
              }

              createJob.mutate({
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
                generateRecurring: payload.generateRecurring ?? true, // Enable recurring by default
              });
            }}
            onJobUpdated={handleUpdateJob}
            onJobDeleted={handleDeleteJob}
            onRequestEdit={(apt) => {
              setAppointmentModal((prev) => ({ ...prev, open: false }));
              handleEditJob(apt);
            }}
          />
        );
      })()}

      <FilterModal open={filterModal} onOpenChange={setFilterModal} onApplyFilters={handleApplyFilters} />

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} jobs?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected jobs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBulkDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
