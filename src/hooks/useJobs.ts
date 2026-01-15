import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useGoogleCalendarSync } from "@/hooks/useGoogleCalendarSync";

export interface Job {
  id: string;
  customer_id: string;
  title: string;
  description: string | null;
  service_type: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  duration_minutes: number | null;
  duration_text?: string | null;
  staff_assigned: string[] | null;
  status: string;
  amount: number | null;
  address: string | null;
  notes: string | null;
  additional_notes?: string | null;
  feedback?: string | null;
  time_started?: string | null;
  time_finished?: string | null;
  on_our_way_time?: string | null;
  payment_status?: string | null;
  invoice_status?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    frequency: string | null;
    payment_method: string | null;
  };
}

export interface JobFormData {
  customer_id: string;
  title: string;
  description?: string;
  service_type?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  duration_minutes?: number;
  duration_text?: string;
  staff_assigned?: string[];
  status: string;
  amount?: number;
  address?: string;
  notes?: string;
  additional_notes?: string;
  isFromLead?: boolean; // Flag to indicate this job originated from a lead
  lead_id?: string; // Reference to the originating lead
  generateRecurring?: boolean; // Flag to generate recurring jobs
}

// Helper to get frequency in days from service type
function getFrequencyDays(serviceType: string | null | undefined): number | null {
  if (!serviceType) return null;
  
  const service = serviceType.toLowerCase();
  
  if (service.includes("weekly") && !service.includes("2") && !service.includes("3") && !service.includes("4") && !service.includes("8")) {
    return 7;
  }
  if (service.includes("2weeks") || service.includes("2 weeks") || service.includes("quinzenal") || service.includes("biweekly")) {
    return 14;
  }
  if (service.includes("3weeks") || service.includes("3 weeks")) {
    return 21;
  }
  if (service.includes("4weeks") || service.includes("4 weeks") || service.includes("once a month") || service.includes("monthly")) {
    return 28;
  }
  if (service.includes("8weeks") || service.includes("8 weeks") || service.includes("once every 2 months")) {
    return 56;
  }
  if (service.includes("3times a week") || service.includes("3 times")) {
    return 2; // Every ~2-3 days
  }
  
  return null;
}

// Generate recurring job dates within one month
function generateRecurringDates(startDate: string, frequencyDays: number): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const oneMonthLater = new Date(startDate);
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
  
  let currentDate = new Date(start);
  currentDate.setDate(currentDate.getDate() + frequencyDays);
  
  while (currentDate <= oneMonthLater) {
    dates.push(currentDate.toISOString().split("T")[0]);
    currentDate.setDate(currentDate.getDate() + frequencyDays);
  }
  
  return dates;
}

// Fetch all jobs with customer info
export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data: jobs, error: jobsError } = await supabase
        .from("jobs")
        .select("*, customer:customers(id, name, email, phone, frequency, payment_method)")
        .order("scheduled_date", { ascending: true });

      if (jobsError) throw jobsError;

      return jobs as Job[];
    },
  });
}

// Fetch jobs for a specific customer
export function useJobsByCustomer(customerId: string | null) {
  return useQuery({
    queryKey: ["jobs", "customer", customerId],
    queryFn: async () => {
      if (!customerId) return [];
      
      const { data: jobs, error: jobsError } = await supabase
        .from("jobs")
        .select("*")
        .eq("customer_id", customerId)
        .order("scheduled_date", { ascending: false });

      if (jobsError) throw jobsError;

      return jobs as Job[];
    },
    enabled: !!customerId,
  });
}

// Create a new job
export function useCreateJob() {
  const queryClient = useQueryClient();
  const { canSync, syncJobToCalendar, syncLeadToCalendar, hasLeadsCalendar } = useGoogleCalendarSync();

  return useMutation({
    mutationFn: async (formData: JobFormData) => {
      // Create the main job
      const { data, error } = await supabase
        .from("jobs")
        .insert({
          customer_id: formData.customer_id,
          title: formData.title,
          description: formData.description || null,
          service_type: formData.service_type || null,
          scheduled_date: formData.scheduled_date || null,
          scheduled_time: formData.scheduled_time || null,
          duration_minutes: formData.duration_minutes ?? null,
          duration_text: formData.duration_text ?? null,
          staff_assigned: formData.staff_assigned || null,
          status: formData.status || "scheduled",
          amount: formData.amount ?? null,
          address: formData.address || null,
          notes: formData.notes || null,
          additional_notes: formData.additional_notes || null,
          lead_id: formData.lead_id || null,
        })
        .select("*, customer:customers(id, name, email, phone, frequency, payment_method)")
        .single();

      if (error) throw error;
      
      const mainJob = data as Job;
      const recurringJobs: Job[] = [];
      
      // Generate recurring jobs if enabled and has a recurring frequency
      if (formData.generateRecurring !== false && formData.scheduled_date) {
        const frequencyDays = getFrequencyDays(formData.service_type);
        
        if (frequencyDays) {
          const recurringDates = generateRecurringDates(formData.scheduled_date, frequencyDays);
          
          if (recurringDates.length > 0) {
            const recurringJobsData = recurringDates.map(date => ({
              customer_id: formData.customer_id,
              title: formData.title,
              description: formData.description || null,
              service_type: formData.service_type || null,
              scheduled_date: date,
              scheduled_time: formData.scheduled_time || null,
              duration_minutes: formData.duration_minutes ?? null,
              duration_text: formData.duration_text ?? null,
              staff_assigned: formData.staff_assigned || null,
              status: "scheduled",
              amount: formData.amount ?? null,
              address: formData.address || null,
              notes: formData.notes || null,
              additional_notes: formData.additional_notes || null,
            }));
            
            const { data: createdRecurring, error: recurringError } = await supabase
              .from("jobs")
              .insert(recurringJobsData)
              .select("*, customer:customers(id, name, email, phone, frequency, payment_method)");
            
            if (recurringError) {
              console.error("Error creating recurring jobs:", recurringError);
            } else if (createdRecurring) {
              recurringJobs.push(...(createdRecurring as Job[]));
            }
          }
        }
      }
      
      return { 
        ...mainJob, 
        isFromLead: formData.isFromLead,
        recurringJobsCreated: recurringJobs.length,
        allJobs: [mainJob, ...recurringJobs],
      };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      
      if (data.recurringJobsCreated > 0) {
        toast.success(`Job created with ${data.recurringJobsCreated} recurring schedule(s)!`);
      } else {
        toast.success("Job created successfully!");
      }
      
      // Auto-sync to Google Calendar if connected
      if (canSync() && data.scheduled_date) {
        // If it's from a lead and has a leads calendar configured, sync to leads calendar
        if (data.isFromLead && hasLeadsCalendar()) {
          await syncLeadToCalendar({
            id: data.id,
            customerName: data.customer?.name || "Cliente",
            address: data.address || "",
            service: data.service_type || data.title,
            date: data.scheduled_date,
            time: data.scheduled_time || "09:00",
            durationMinutes: data.duration_minutes || 120,
            notes: data.notes || undefined,
            amount: data.amount || undefined,
          });
        } else {
          // Regular job - sync to main calendar
          await syncJobToCalendar(data);
        }
        
        // Sync recurring jobs to calendar as well
        for (const job of data.allJobs.slice(1)) {
          if (job.scheduled_date) {
            await syncJobToCalendar(job);
          }
        }
      }
    },
    onError: (error) => {
      console.error("Error creating job:", error);
      toast.error("Failed to create job");
    },
  });
}

// Update a job
export function useUpdateJob() {
  const queryClient = useQueryClient();
  const { canSync, updateJobInCalendar, deleteJobFromCalendar } = useGoogleCalendarSync();

  return useMutation({
    mutationFn: async ({ id, ...formData }: JobFormData & { id: string; previousStatus?: string }) => {
      const { data, error } = await supabase
        .from("jobs")
        .update({
          customer_id: formData.customer_id,
          title: formData.title,
          description: formData.description || null,
          service_type: formData.service_type || null,
          scheduled_date: formData.scheduled_date || null,
          scheduled_time: formData.scheduled_time || null,
          duration_minutes: formData.duration_minutes ?? null,
          duration_text: formData.duration_text ?? null,
          staff_assigned: formData.staff_assigned || null,
          status: formData.status || "scheduled",
          amount: formData.amount ?? null,
          address: formData.address || null,
          notes: formData.notes || null,
          additional_notes: formData.additional_notes || null,
        })
        .eq("id", id)
        .select("*, customer:customers(id, name, email, phone, frequency, payment_method)")
        .single();

      if (error) throw error;
      
      // Return data with status change info
      return { 
        ...(data as Job), 
        statusChanged: formData.status === "completed" && formData.previousStatus !== "completed",
        wasCancelled: formData.status === "cancelled",
      };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["payroll_records"] }); // Sync payroll
      toast.success("Job updated successfully!");
      
      // Trigger auto-sync event if job was completed
      if (data.statusChanged) {
        window.dispatchEvent(new CustomEvent("job-completed", { 
          detail: { jobId: data.id, job: data }
        }));
      }
      
      // Sync to Google Calendar
      if (canSync()) {
        if (data.wasCancelled) {
          // Remove from calendar if cancelled
          await deleteJobFromCalendar(data.id);
        } else if (data.scheduled_date) {
          // Update calendar event
          await updateJobInCalendar(data);
        }
      }
    },
    onError: (error) => {
      console.error("Error updating job:", error);
      toast.error("Failed to update job");
    },
  });
}

// Delete a job
export function useDeleteJob() {
  const queryClient = useQueryClient();
  const { canSync, deleteJobFromCalendar } = useGoogleCalendarSync();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete from calendar first if connected
      if (canSync()) {
        await deleteJobFromCalendar(id);
      }
      
      const { error } = await supabase.from("jobs").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["payroll_records"] }); // Sync payroll
      toast.success("Job deleted successfully!");
    },
    onError: (error) => {
      console.error("Error deleting job:", error);
      toast.error("Failed to delete job");
    },
  });
}

// Update specific job fields (notes, feedback, timeline)
export interface JobFieldsUpdate {
  id: string;
  notes?: string | null;
  additional_notes?: string | null;
  feedback?: string | null;
  time_started?: string | null;
  time_finished?: string | null;
  on_our_way_time?: string | null;
  status?: string;
}

export function useUpdateJobFields() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...fields }: JobFieldsUpdate) => {
      const updateData: Record<string, unknown> = {};
      
      if (fields.notes !== undefined) updateData.notes = fields.notes;
      if (fields.additional_notes !== undefined) updateData.additional_notes = fields.additional_notes;
      if (fields.feedback !== undefined) updateData.feedback = fields.feedback;
      if (fields.time_started !== undefined) updateData.time_started = fields.time_started;
      if (fields.time_finished !== undefined) updateData.time_finished = fields.time_finished;
      if (fields.on_our_way_time !== undefined) updateData.on_our_way_time = fields.on_our_way_time;
      if (fields.status !== undefined) updateData.status = fields.status;

      const { data, error } = await supabase
        .from("jobs")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (error) => {
      console.error("Error updating job fields:", error);
      toast.error("Failed to update job");
    },
  });
}

// Excel import row interface - matches export columns exactly
export interface ImportedJobRow {
  "Customer Name"?: string;
  "Service Type"?: string;
  "Address"?: string;
  "Job Notes"?: string;
  "Additional Notes"?: string;
  "Feedback"?: string;
  "Scheduled Date"?: string | number;
  "Scheduled Time"?: string | number;
  "Staff Assigned"?: string;
  "Status"?: string;
  "Time Started"?: string | number;
  "Time Finished"?: string | number;
  "Total Cleaning Time"?: string | number;
  "Amount"?: number | string;
  "Payment Status"?: string;
  "Invoice Status"?: string;

  // Backwards-compat columns (legacy imports)
  "Notes"?: string;
  "Date"?: string | number;
  "Time"?: string | number;
  "Title"?: string;
  "Description"?: string;
  "Duration"?: string | number;
  "Duration (minutes)"?: number;
  "Staff Member 1"?: string;
  "Staff Member 2"?: string;
  "Staff Member 3"?: string;
  "Staff Member 4"?: string;

  [key: string]: string | number | undefined;
}

// Helper function to convert Excel serial date (or date strings) to YYYY-MM-DD format
// IMPORTANT: Use UTC formatting to avoid timezone shifting (e.g. ISO midnight becoming the previous day).
function formatDateUTC(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseExcelDate(value: unknown): string | null {
  if (value == null || value === "") return null;

  // If it's already a date object
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : formatDateUTC(value);
  }

  // If it's a string (handles "YYYY-MM-DD", ISO datetime, and other formats)
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;

    // If string begins with YYYY-MM-DD (covers "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ssZ")
    const isoPrefix = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoPrefix) return isoPrefix[1];

    // Numeric strings (Excel serial dates, possibly with decimals)
    if (/^[\d.]+$/.test(s)) {
      const n = parseFloat(s);
      if (Number.isFinite(n)) {
        // Excel 1900 date system: day 1 = 1900-01-01, but Excel incorrectly includes 1900-02-29 (day 60)
        let days = Math.floor(n);
        if (days >= 60) days -= 1; // compensate for Excel's fake 1900-02-29
        const excelEpochMs = Date.UTC(1899, 11, 31);
        return formatDateUTC(new Date(excelEpochMs + days * 24 * 60 * 60 * 1000));
      }
    }

    const parsed = new Date(s);
    return isNaN(parsed.getTime()) ? null : formatDateUTC(parsed);
  }

  // If it's a number (Excel serial date)
  if (typeof value === "number" && Number.isFinite(value)) {
    // Excel 1900 date system: day 1 = 1900-01-01, but Excel incorrectly includes 1900-02-29 (day 60)
    let days = Math.floor(value);
    if (days >= 60) days -= 1; // compensate for Excel's fake 1900-02-29
    const excelEpochMs = Date.UTC(1899, 11, 31);
    return formatDateUTC(new Date(excelEpochMs + days * 24 * 60 * 60 * 1000));
  }

  return null;
}

// Helper function to convert Excel serial time (decimal) to HH:MM format
function parseExcelTime(value: string | number | undefined): string | null {
  if (value == null || value === "") return null;

  // If it's already a valid time string (HH:MM or HH:MM:SS), return it
  if (typeof value === "string") {
    const timeMatch = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (timeMatch) {
      const hours = String(timeMatch[1]).padStart(2, "0");
      const minutes = String(timeMatch[2]).padStart(2, "0");
      return `${hours}:${minutes}`;
    }
  }

  // If it's a number (Excel serial time - decimal fraction of day), convert it
  if (typeof value === "number" || (typeof value === "string" && /^[\d.]+$/.test(value))) {
    const decimalTime = typeof value === "number" ? value : parseFloat(value);
    if (decimalTime >= 0 && decimalTime < 1) {
      // Excel time is fraction of day (0.5 = 12:00, 0.333... = 8:00)
      const totalMinutes = Math.round(decimalTime * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
  }

  return null;
}

function parseDurationToMinutes(value: string | number | undefined): number | null {
  if (value == null || value === "") return null;

  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value) : null;

  const s = String(value).trim().toLowerCase();
  if (!s) return null;

  // e.g. "150" => minutes
  if (/^\d+$/.test(s)) return parseInt(s, 10);

  // e.g. "2:30" => hours:minutes
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

function parseAmountToNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const s = String(value);
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

type CustomerLookupRow = { id: string; name: string; norm: string };

function normalizeCustomerName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[\/|]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const n = b.length;
  const dp = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;

  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(
        dp[j] + 1, // deletion
        dp[j - 1] + 1, // insertion
        prev + cost // substitution
      );
      prev = temp;
    }
  }

  return dp[n];
}

function similarityRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshteinDistance(a, b);
  return 1 - dist / maxLen;
}

function findBestCustomerMatch(targetNorm: string, candidates: CustomerLookupRow[]): CustomerLookupRow | null {
  if (!targetNorm) return null;

  let best: CustomerLookupRow | null = null;
  let bestScore = 0;
  let secondBestScore = 0;

  for (const c of candidates) {
    if (!c.norm) continue;

    // quick win: substring containment
    if (c.norm === targetNorm) return c;

    const score = similarityRatio(targetNorm, c.norm);
    if (score > bestScore) {
      secondBestScore = bestScore;
      bestScore = score;
      best = c;
    } else if (score > secondBestScore) {
      secondBestScore = score;
    }
  }

  // be conservative to avoid wrong customer linkage
  const confident = bestScore >= 0.9 && bestScore - secondBestScore >= 0.03;
  return confident ? best : null;
}

// Import jobs from Excel data
export function useImportJobs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rows: ImportedJobRow[]) => {
      const results = { success: 0, failed: 0, errors: [] as string[] };

      console.log(`Starting import of ${rows.length} rows`);

      // First, fetch all customers to map names to IDs
      const { data: customers, error: customersError } = await supabase
        .from("customers")
        .select("id, name");

      if (customersError) throw customersError;

      const customerIndex: CustomerLookupRow[] = (customers ?? [])
        .filter((c): c is { id: string; name: string } => Boolean(c?.id && c?.name))
        .map((c) => ({ id: c.id, name: c.name, norm: normalizeCustomerName(c.name) }))
        .filter((c) => c.norm.length > 0);

      const customerMap = new Map<string, string>();
      customerIndex.forEach((c) => {
        customerMap.set(c.name.toLowerCase().trim(), c.id); // exact legacy
        customerMap.set(c.norm, c.id); // normalized
      });

      console.log(`Loaded ${customerIndex.length} customers for matching`);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const customerName = row["Customer Name"]?.toString().trim();
          if (!customerName) {
            console.warn(`Row ${i + 1}: Skipping - no Customer Name`);
            results.errors.push(`Row ${i + 1}: No Customer Name`);
            results.failed++;
            continue;
          }

          // Find customer ID by name (more robust matching)
          const customerNameNorm = normalizeCustomerName(customerName);

          let customerId: string | undefined =
            customerMap.get(customerName.toLowerCase().trim()) || customerMap.get(customerNameNorm);

          if (!customerId) {
            // Try a safe substring match (only if exactly one match)
            const matches = customerIndex.filter((c) =>
              c.norm === customerNameNorm || c.norm.includes(customerNameNorm) || customerNameNorm.includes(c.norm)
            );
            if (matches.length === 1) {
              customerId = matches[0].id;
              console.log(`Row ${i + 1}: Customer "${customerName}" matched by substring to "${matches[0].name}"`);
            }
          }

          if (!customerId) {
            // Try fuzzy match (conservative threshold)
            const best = findBestCustomerMatch(customerNameNorm, customerIndex);
            if (best) {
              customerId = best.id;
              console.log(`Row ${i + 1}: Customer "${customerName}" matched by fuzzy to "${best.name}"`);
            }
          }

          if (!customerId) {
            console.error(`Row ${i + 1}: Customer not found: "${customerName}"`);
            results.errors.push(`Row ${i + 1}: Customer not found: "${customerName}"`);
            results.failed++;
            continue;
          }

          // Parse status
          const statusMap: Record<string, string> = {
            Scheduled: "scheduled",
            "In Progress": "in-progress",
            Completed: "completed",
            Cancelled: "cancelled",
          };

          const rawStatus = row["Status"]?.toString() || "";
          const status = statusMap[rawStatus] || rawStatus.toLowerCase() || "scheduled";

          // Parse staff assigned
          const staffFromColumns = [
            row["Staff Member 1"],
            row["Staff Member 2"],
            row["Staff Member 3"],
            row["Staff Member 4"],
          ]
            .map((s) => (s ? String(s).trim() : ""))
            .filter(Boolean);

          const staffFromLegacy = (row["Staff Assigned"]?.toString() || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

          const staffAssigned = (staffFromColumns.length ? staffFromColumns : staffFromLegacy).length
            ? (staffFromColumns.length ? staffFromColumns : staffFromLegacy)
            : null;

          // Parse dates and times (handle Excel decimal formats)
          // Priority: new column names, then legacy column names
          const scheduledDate = parseExcelDate(row["Scheduled Date"] ?? row["Date"]);
          const scheduledTime = parseExcelTime(row["Scheduled Time"] ?? row["Time"]);
          const timeStarted = parseExcelTime(row["Time Started"]);
          const timeFinished = parseExcelTime(row["Time Finished"]);

          // Duration: "Total Cleaning Time" (new) or "Duration" (legacy)
          const durationTextRaw = row["Total Cleaning Time"] ?? row["Duration"];
          const durationText = durationTextRaw != null && durationTextRaw !== "" ? String(durationTextRaw) : null;
          const durationMinutesFromCol = row["Duration (minutes)"];
          const durationMinutes =
            durationMinutesFromCol != null
              ? durationMinutesFromCol
              : parseDurationToMinutes(durationTextRaw);

          // Title: if not provided, default to service type
          const serviceType = row["Service Type"]?.toString() || null;
          const title = (row["Title"]?.toString() || serviceType || "Untitled Job").toString();

          const amount = parseAmountToNumber(row["Amount"]);

          // Notes: "Job Notes" (new) or "Notes" (legacy)
          const notes = row["Job Notes"]?.toString() || row["Notes"]?.toString() || null;

          // Payment and Invoice status
          const paymentStatus = row["Payment Status"]?.toString() || "Pending";
          const invoiceStatus = row["Invoice Status"]?.toString() || "Not Generated";

          // Feedback
          const feedback = row["Feedback"]?.toString() || null;

          // Insert job
          const { error: jobError } = await supabase.from("jobs").insert({
            customer_id: customerId,
            title,
            description: row["Description"]?.toString() || null,
            service_type: serviceType,
            scheduled_date: scheduledDate,
            scheduled_time: scheduledTime,
            time_started: timeStarted,
            time_finished: timeFinished,
            duration_minutes: durationMinutes ?? null,
            duration_text: durationText,
            staff_assigned: staffAssigned,
            status,
            amount,
            address: row["Address"]?.toString() || null,
            notes,
            additional_notes: row["Additional Notes"]?.toString() || null,
            feedback,
            payment_status: paymentStatus,
            invoice_status: invoiceStatus,
          });

          if (jobError) {
            console.error("Error inserting job:", jobError);
            results.failed++;
            continue;
          }

          results.success++;
        } catch (error) {
          console.error(`Row ${i + 1}: Error processing:`, error);
          results.errors.push(`Row ${i + 1}: Processing error`);
          results.failed++;
        }
      }

      console.log(`Import complete: ${results.success} success, ${results.failed} failed`);
      if (results.errors.length > 0) {
        console.log("Import errors:", results.errors);
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      if (results.failed === 0) {
        toast.success(`${results.success} jobs imported successfully!`);
      } else {
        toast.warning(`Imported ${results.success} jobs. ${results.failed} failed. Check console for details.`);
      }
    },
    onError: (error) => {
      console.error("Error importing jobs:", error);
      toast.error("Failed to import jobs");
    },
  });
}
