import { useCallback } from "react";
import { useGoogle } from "@/hooks/useGoogle";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { Job } from "@/hooks/useJobs";
import { googleState } from "@/lib/googleState";

interface CalendarEventData {
  jobId: string;
  title: string;
  description?: string;
  location?: string;
  startDateTime: string;
  endDateTime: string;
  attendees?: string[];
}

const CALENDAR_EVENT_MAP_KEY = "google_calendar_events";
const SELECTED_CALENDAR_KEY = "google_selected_calendar";
const LEADS_CALENDAR_KEY = "google_leads_calendar";

// Store mapping between job IDs and Google Calendar event IDs
function getEventMap(): Record<string, string> {
  const stored = localStorage.getItem(CALENDAR_EVENT_MAP_KEY);
  return stored ? JSON.parse(stored) : {};
}

function setEventMap(map: Record<string, string>) {
  localStorage.setItem(CALENDAR_EVENT_MAP_KEY, JSON.stringify(map));
}

// Get/set selected calendar ID for jobs
export function getSelectedCalendarId(): string {
  return localStorage.getItem(SELECTED_CALENDAR_KEY) || "primary";
}

export function setSelectedCalendarId(calendarId: string) {
  localStorage.setItem(SELECTED_CALENDAR_KEY, calendarId);
}

// Get/set selected calendar ID for leads
export function getLeadsCalendarId(): string {
  const stored = localStorage.getItem(LEADS_CALENDAR_KEY) || "";
  // "none" is a UI sentinel meaning disabled
  return stored === "none" ? "" : stored;
}

export function setLeadsCalendarId(calendarId: string) {
  // "none" (or empty) disables leads calendar sync
  if (!calendarId || calendarId === "none") {
    localStorage.removeItem(LEADS_CALENDAR_KEY);
    return;
  }
  localStorage.setItem(LEADS_CALENDAR_KEY, calendarId);
}

export function useGoogleCalendarSync() {
  const { 
    createEvent, 
    updateEvent, 
    deleteEvent,
    listCalendars,
  } = useGoogle();

  // Check if can sync using the global state manager
  const canSync = useCallback(() => {
    const isConnected = googleState.isConnected();
    const hasCalendar = googleState.hasCalendarAccess();
    
    console.log("[CalendarSync] canSync check - isConnected:", isConnected, "hasCalendarAccess:", hasCalendar);
    
    if (isConnected && hasCalendar) {
      return true;
    }
    
    return false;
  }, []);

  // Get the selected calendar ID
  const getCalendarId = useCallback(() => {
    return getSelectedCalendarId();
  }, []);

  // Fetch available calendars
  const fetchCalendars = useCallback(async () => {
    if (!canSync()) return [];
    try {
      const calendars = await listCalendars();
      return calendars || [];
    } catch (error) {
      console.error("Failed to fetch calendars:", error);
      return [];
    }
  }, [canSync, listCalendars]);

  // Helper to normalize time format to HH:MM
  const normalizeTime = (time: string | null | undefined): string => {
    if (!time) return "09:00";
    
    const trimmed = time.trim();
    
    // Already in HH:MM or HH:MM:SS format
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      const parts = trimmed.split(':');
      const hours = parts[0].padStart(2, '0');
      const minutes = parts[1];
      return `${hours}:${minutes}`;
    }
    
    // Just hours (e.g., "8" or "14")
    if (/^\d{1,2}$/.test(trimmed)) {
      const hours = trimmed.padStart(2, '0');
      return `${hours}:00`;
    }
    
    // Try to extract time from various formats
    const match = trimmed.match(/(\d{1,2})[:\s]?(\d{2})?/);
    if (match) {
      const hours = (match[1] || '09').padStart(2, '0');
      const minutes = match[2] || '00';
      return `${hours}:${minutes}`;
    }
    
    return "09:00"; // Default fallback
  };

  // Convert job data to calendar event format
  const jobToCalendarEvent = useCallback((job: Job | CalendarEventData): {
    summary: string;
    description: string;
    location: string;
    startDateTime: string;
    endDateTime: string;
    calendarId: string;
  } => {
    const calendarId = getSelectedCalendarId();
    
    // Handle CalendarEventData format
    if ('jobId' in job) {
      return {
        summary: job.title,
        description: job.description || "",
        location: job.location || "",
        startDateTime: job.startDateTime,
        endDateTime: job.endDateTime,
        calendarId,
      };
    }

    // Handle Job format
    const startDate = job.scheduled_date || new Date().toISOString().split('T')[0];
    const startTime = normalizeTime(job.scheduled_time);
    const durationMinutes = job.duration_minutes || 120; // Default 2 hours

    // Build the date string more safely
    const dateTimeString = `${startDate}T${startTime}:00`;
    let startDateTime = new Date(dateTimeString);
    
    // If invalid date, use today at 9am as fallback
    if (isNaN(startDateTime.getTime())) {
      console.warn(`Invalid date/time for job ${job.id}: ${dateTimeString}, using fallback`);
      startDateTime = new Date();
      startDateTime.setHours(9, 0, 0, 0);
    }
    
    const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

    const customerName = job.customer?.name || "Cliente";
    const serviceType = job.service_type || job.title;

    return {
      summary: `🧹 ${customerName} - ${serviceType}`,
      description: [
        `Serviço: ${serviceType}`,
        job.description ? `Descrição: ${job.description}` : "",
        job.notes ? `Notas: ${job.notes}` : "",
        job.amount ? `Valor: $${job.amount}` : "",
        job.staff_assigned?.length ? `Equipe: ${job.staff_assigned.join(", ")}` : "",
      ].filter(Boolean).join("\n"),
      location: job.address || "",
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      calendarId,
    };
  }, []);

  // Create calendar event for a job
  const syncJobToCalendar = useCallback(async (job: Job): Promise<string | null> => {
    if (!canSync()) {
      console.log("Google Calendar sync not available");
      return null;
    }

    try {
      const eventData = jobToCalendarEvent(job);
      const result = await createEvent(eventData);

      if (result?.id) {
        // Store mapping
        const map = getEventMap();
        map[job.id] = result.id;
        setEventMap(map);

        toast.success("Job sincronizado com Google Calendar!");
        return result.id;
      }
      return null;
    } catch (error: unknown) {
      console.error("Failed to sync job to calendar:", error);
      toast.error(`Falha ao sincronizar com Calendar: ${getErrorMessage(error, "Erro desconhecido")}`);
      return null;
    }
  }, [canSync, createEvent, jobToCalendarEvent]);

  // Update calendar event for a job
  const updateJobInCalendar = useCallback(async (job: Job): Promise<boolean> => {
    if (!canSync()) return false;

    try {
      const map = getEventMap();
      const eventId = map[job.id];
      const calendarId = getSelectedCalendarId();

      if (!eventId) {
        // No existing event, create one
        await syncJobToCalendar(job);
        return true;
      }

      const eventData = jobToCalendarEvent(job);
      await updateEvent({
        eventId,
        summary: eventData.summary,
        description: eventData.description,
        location: eventData.location,
        startDateTime: eventData.startDateTime,
        endDateTime: eventData.endDateTime,
        calendarId,
      });

      toast.success("Evento do Calendar atualizado!");
      return true;
    } catch (error: unknown) {
      console.error("Failed to update calendar event:", error);
      // If event doesn't exist anymore, create a new one
      const message = getErrorMessage(error, "");
      if (message.includes("404") || message.includes("Not Found")) {
        const map = getEventMap();
        delete map[job.id];
        setEventMap(map);
        await syncJobToCalendar(job);
        return true;
      }
      toast.error(`Falha ao atualizar evento: ${getErrorMessage(error, "Erro desconhecido")}`);
      return false;
    }
  }, [canSync, updateEvent, jobToCalendarEvent, syncJobToCalendar]);

  // Delete calendar event for a job
  const deleteJobFromCalendar = useCallback(async (jobId: string): Promise<boolean> => {
    if (!canSync()) return false;

    try {
      const map = getEventMap();
      const eventId = map[jobId];
      const calendarId = getSelectedCalendarId();

      if (!eventId) return true; // No event to delete

      await deleteEvent(eventId, calendarId);

      delete map[jobId];
      setEventMap(map);

      toast.success("Evento removido do Calendar");
      return true;
    } catch (error: unknown) {
      console.error("Failed to delete calendar event:", error);
      // If already deleted, just remove mapping
      const message = getErrorMessage(error, "");
      if (message.includes("404") || message.includes("Not Found")) {
        const map = getEventMap();
        delete map[jobId];
        setEventMap(map);
        return true;
      }
      return false;
    }
  }, [canSync, deleteEvent]);

  // Check if a job has a synced calendar event
  const hasCalendarEvent = useCallback((jobId: string): boolean => {
    const map = getEventMap();
    return !!map[jobId];
  }, []);

  // Get calendar event ID for a job
  const getCalendarEventId = useCallback((jobId: string): string | null => {
    const map = getEventMap();
    return map[jobId] || null;
  }, []);

  // Bulk sync multiple jobs to calendar
  const syncMultipleJobsToCalendar = useCallback(async (
    jobs: Job[],
    onProgress?: (current: number, total: number) => void
  ): Promise<{ synced: number; failed: number; errors: string[] }> => {
    if (!canSync()) {
      console.log("Google Calendar sync not available");
      return { synced: 0, failed: 0, errors: ["Google Calendar não está conectado"] };
    }

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];
    const total = jobs.length;

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      try {
        // Skip jobs without scheduled date
        if (!job.scheduled_date) {
          console.log(`Skipping job ${job.id} - no scheduled date`);
          synced++; // Count as success since it's expected
          onProgress?.(i + 1, total);
          continue;
        }

        // Skip jobs that already have calendar events
        if (hasCalendarEvent(job.id)) {
          console.log(`Skipping job ${job.id} - already synced`);
          synced++;
          onProgress?.(i + 1, total);
          continue;
        }

        const eventData = jobToCalendarEvent(job);
        console.log(`Syncing job ${job.id} to calendar...`, eventData);
        
        const result = await createEvent(eventData);

        if (result?.id) {
          const map = getEventMap();
          map[job.id] = result.id;
          setEventMap(map);
          synced++;
          console.log(`Job ${job.id} synced successfully`);
        } else if (result?.error) {
          const errorMsg = `Job "${job.title}": ${result.error.message || result.error}`;
          console.error(`Failed to sync job ${job.id}:`, result.error);
          errors.push(errorMsg);
          failed++;
        } else {
          // No ID returned but no explicit error - might have succeeded
          console.warn(`Job ${job.id} - unclear result:`, result);
          synced++;
        }
      } catch (error: unknown) {
        const errorMsg = `Job "${job.title}": ${getErrorMessage(error, "Erro desconhecido")}`;
        console.error(`Failed to sync job ${job.id}:`, error);
        errors.push(errorMsg);
        failed++;
      }
      onProgress?.(i + 1, total);
      
      // Small delay to avoid rate limiting
      if (i < jobs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return { synced, failed, errors };
  }, [canSync, createEvent, jobToCalendarEvent, hasCalendarEvent]);

  // Sync a lead appointment to the leads calendar
  const syncLeadToCalendar = useCallback(async (leadData: {
    id: string;
    customerName: string;
    address: string;
    service: string;
    date: string;
    time: string;
    durationMinutes?: number;
    notes?: string;
    amount?: number;
  }): Promise<string | null> => {
    if (!canSync()) {
      console.log("Google Calendar sync not available");
      return null;
    }

    const leadsCalendarId = getLeadsCalendarId();
    if (!leadsCalendarId) {
      console.log("No leads calendar configured");
      return null;
    }

    try {
      const startTime = normalizeTime(leadData.time);
      const startDate = leadData.date;
      const durationMinutes = leadData.durationMinutes || 60;

      const dateTimeString = `${startDate}T${startTime}:00`;
      let startDateTime = new Date(dateTimeString);
      
      if (isNaN(startDateTime.getTime())) {
        console.warn(`Invalid date/time for lead: ${dateTimeString}, using fallback`);
        startDateTime = new Date();
        startDateTime.setHours(9, 0, 0, 0);
      }
      
      const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

      const eventData = {
        summary: `📋 Lead: ${leadData.customerName} - ${leadData.service}`,
        description: [
          `Cliente: ${leadData.customerName}`,
          `Serviço: ${leadData.service}`,
          leadData.amount ? `Valor: $${leadData.amount}` : "",
          leadData.notes ? `Notas: ${leadData.notes}` : "",
        ].filter(Boolean).join("\n"),
        location: leadData.address || "",
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        calendarId: leadsCalendarId,
      };

      console.log("[CalendarSync] Syncing lead to calendar:", eventData);
      const result = await createEvent(eventData);

      if (result?.id) {
        const map = getEventMap();
        map[`lead_${leadData.id}`] = result.id;
        setEventMap(map);

        toast.success("Lead sincronizado com Google Calendar!");
        return result.id;
      }
      return null;
    } catch (error: unknown) {
      console.error("Failed to sync lead to calendar:", error);
      toast.error(`Falha ao sincronizar lead: ${getErrorMessage(error, "Erro desconhecido")}`);
      return null;
    }
  }, [canSync, createEvent]);

  // Check if leads calendar is configured
  const hasLeadsCalendar = useCallback(() => {
    return !!getLeadsCalendarId();
  }, []);

  return {
    canSync,
    syncJobToCalendar,
    updateJobInCalendar,
    deleteJobFromCalendar,
    hasCalendarEvent,
    getCalendarEventId,
    fetchCalendars,
    getCalendarId,
    setCalendarId: setSelectedCalendarId,
    syncMultipleJobsToCalendar,
    // Leads
    syncLeadToCalendar,
    hasLeadsCalendar,
    getLeadsCalendarId,
    setLeadsCalendarId,
  };
}
