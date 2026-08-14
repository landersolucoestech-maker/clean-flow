import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/app/infrastructure/supabase/client";
import { toast } from "sonner";
import { useGoogleCalendarSync } from "../../settings/hooks/useGoogleCalendarSync";
import type { Job, JobFormData } from "../types/job";

function getFrequencyDays(serviceType: string | null | undefined): number | null {
  if (!serviceType) return null;
  const service = serviceType.toLowerCase();
  if (service.includes("weekly") && !service.includes("2") && !service.includes("3") && !service.includes("4") && !service.includes("8")) return 7;
  if (service.includes("2weeks") || service.includes("2 weeks") || service.includes("quinzenal") || service.includes("biweekly")) return 14;
  if (service.includes("3weeks") || service.includes("3 weeks")) return 21;
  if (service.includes("4weeks") || service.includes("4 weeks") || service.includes("once a month") || service.includes("monthly")) return 28;
  if (service.includes("8weeks") || service.includes("8 weeks") || service.includes("once every 2 months")) return 56;
  if (service.includes("3times a week") || service.includes("3 times")) return 2;
  return null;
}

function generateRecurringDates(startDate: string, frequencyDays: number): string[] {
  const dates: string[] = [];
  const oneMonthLater = new Date(`${startDate}T12:00:00`);
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
  const currentDate = new Date(`${startDate}T12:00:00`);
  currentDate.setDate(currentDate.getDate() + frequencyDays);
  while (currentDate <= oneMonthLater) {
    dates.push(currentDate.toISOString().split("T")[0]);
    currentDate.setDate(currentDate.getDate() + frequencyDays);
  }
  return dates;
}

export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, customer:customers(id, name, email, phone, frequency, payment_method)")
        .neq("status", "archived")
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return data as Job[];
    },
  });
}

export function useJobsByCustomer(customerId: string | null) {
  return useQuery({
    queryKey: ["jobs", "customer", customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("customer_id", customerId)
        .neq("status", "archived")
        .order("scheduled_date", { ascending: false });
      if (error) throw error;
      return data as Job[];
    },
    enabled: !!customerId,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  const { canSync, syncJobToCalendar, syncLeadToCalendar } = useGoogleCalendarSync();

  return useMutation({
    mutationFn: async (formData: JobFormData) => {
      const mainJobId = crypto.randomUUID();
      const baseJob = {
        customer_id: formData.customer_id,
        title: formData.title,
        description: formData.description || null,
        service_type: formData.service_type || null,
        scheduled_time: formData.scheduled_time || null,
        duration_minutes: formData.duration_minutes ?? null,
        duration_text: formData.duration_text ?? null,
        staff_assigned: formData.staff_assigned || null,
        amount: formData.amount ?? null,
        address: formData.address || null,
        notes: formData.notes || null,
        additional_notes: formData.additional_notes || null,
      };

      const recurringDates = formData.generateRecurring !== false && formData.scheduled_date
        ? (() => {
            const frequencyDays = getFrequencyDays(formData.service_type);
            return frequencyDays ? generateRecurringDates(formData.scheduled_date, frequencyDays) : [];
          })()
        : [];

      const rows = [
        {
          id: mainJobId,
          ...baseJob,
          scheduled_date: formData.scheduled_date || null,
          status: formData.status || "scheduled",
          lead_id: formData.lead_id || null,
        },
        ...recurringDates.map((scheduledDate) => ({
          id: crypto.randomUUID(),
          ...baseJob,
          scheduled_date: scheduledDate,
          status: "scheduled",
          lead_id: null,
        })),
      ];

      // A single multi-row INSERT is one PostgreSQL transaction: either the main
      // job and all recurring jobs are committed, or none of them are.
      const { data, error } = await supabase
        .from("jobs")
        .insert(rows)
        .select("*, customer:customers(id, name, email, phone, frequency, payment_method)");
      if (error) throw error;

      const allJobs = data as Job[];
      const mainJob = allJobs.find((job) => job.id === mainJobId);
      if (!mainJob) throw new Error("Main job was not returned after atomic insert");
      const recurringJobs = allJobs.filter((job) => job.id !== mainJobId);

      return {
        ...mainJob,
        isFromLead: formData.isFromLead,
        recurringJobsCreated: recurringJobs.length,
        allJobs: [mainJob, ...recurringJobs],
      };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success(data.recurringJobsCreated > 0
        ? `Job created with ${data.recurringJobsCreated} recurring schedule(s)!`
        : "Job created successfully!");

      if (!canSync() || !data.scheduled_date) return;

      if (data.isFromLead) {
        const leadEventId = await syncLeadToCalendar({
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
        if (!leadEventId) await syncJobToCalendar(data);
      } else {
        await syncJobToCalendar(data);
      }

      for (const recurringJob of data.allJobs.slice(1)) {
        if (recurringJob.scheduled_date) await syncJobToCalendar(recurringJob);
      }
    },
    onError: (error) => {
      console.error("Error creating job:", error);
      toast.error("Failed to create job");
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  const { canSync, deleteJobFromCalendar } = useGoogleCalendarSync();

  return useMutation({
    mutationFn: async (id: string) => {
      if (canSync()) await deleteJobFromCalendar(id);
      const { error } = await supabase.from("jobs").update({ status: "archived" }).eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["payroll_records"] });
      toast.success("Job archived successfully!");
    },
    onError: (error) => {
      console.error("Error archiving job:", error);
      toast.error("Failed to archive job");
    },
  });
}
