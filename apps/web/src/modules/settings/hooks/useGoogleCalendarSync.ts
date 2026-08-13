import { useCallback, useEffect } from "react";
import { useGoogle } from "@/hooks/useGoogle";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import type { Job } from "@/hooks/useJobs";
import {
  loadCalendarState,
  removeCalendarMapping,
  saveCalendarMapping,
  saveCalendarPreferences,
  type CalendarEntityType,
} from "../services/googleCalendarState.service";

interface CalendarEventData {
  jobId: string;
  title: string;
  description?: string;
  location?: string;
  startDateTime: string;
  endDateTime: string;
  attendees?: string[];
}

type CachedMapping = { eventId: string; calendarId: string };

let selectedCalendarId = "primary";
let leadsCalendarId = "";
const eventMap = new Map<string, CachedMapping>();
let stateLoadPromise: Promise<void> | null = null;

const mappingKey = (entityType: CalendarEntityType, entityId: string) => `${entityType}:${entityId}`;

async function ensureCalendarStateLoaded(force = false): Promise<void> {
  if (force) stateLoadPromise = null;
  if (!stateLoadPromise) {
    stateLoadPromise = loadCalendarState().then(({ preferences, mappings }) => {
      selectedCalendarId = preferences.selectedCalendarId || "primary";
      leadsCalendarId = preferences.leadsCalendarId || "";
      eventMap.clear();
      for (const mapping of mappings) {
        eventMap.set(mappingKey(mapping.entityType, mapping.entityId), {
          eventId: mapping.eventId,
          calendarId: mapping.calendarId,
        });
      }
    }).catch((error) => {
      stateLoadPromise = null;
      throw error;
    });
  }
  return stateLoadPromise;
}

export async function loadGoogleCalendarPreferences(): Promise<{ selectedCalendarId: string; leadsCalendarId: string }> {
  await ensureCalendarStateLoaded(true);
  return { selectedCalendarId, leadsCalendarId };
}

export function getSelectedCalendarId(): string {
  return selectedCalendarId;
}

export async function setSelectedCalendarId(calendarId: string): Promise<void> {
  selectedCalendarId = calendarId || "primary";
  await saveCalendarPreferences({ selectedCalendarId, leadsCalendarId });
}

export function getLeadsCalendarId(): string {
  return leadsCalendarId;
}

export async function setLeadsCalendarId(calendarId: string): Promise<void> {
  leadsCalendarId = !calendarId || calendarId === "none" ? "" : calendarId;
  await saveCalendarPreferences({ selectedCalendarId, leadsCalendarId });
}

async function persistMapping(entityType: CalendarEntityType, entityId: string, calendarId: string, eventId: string) {
  await saveCalendarMapping({ entityType, entityId, calendarId, eventId });
  eventMap.set(mappingKey(entityType, entityId), { eventId, calendarId });
}

async function clearMapping(entityType: CalendarEntityType, entityId: string) {
  await removeCalendarMapping(entityType, entityId);
  eventMap.delete(mappingKey(entityType, entityId));
}

export function useGoogleCalendarSync() {
  const { createEvent, updateEvent, deleteEvent, listCalendars, isConnected, hasCalendarAccess } = useGoogle();

  useEffect(() => {
    if (!isConnected) return;
    void ensureCalendarStateLoaded(true).catch((error) => {
      console.error("Failed to load Google Calendar state:", error);
    });
  }, [isConnected]);

  const canSync = useCallback(() => isConnected && hasCalendarAccess(), [hasCalendarAccess, isConnected]);
  const getCalendarId = useCallback(() => getSelectedCalendarId(), []);

  const fetchCalendars = useCallback(async () => {
    if (!canSync()) return [];
    try {
      return (await listCalendars()) || [];
    } catch (error) {
      console.error("Failed to fetch calendars:", error);
      return [];
    }
  }, [canSync, listCalendars]);

  const normalizeTime = (time: string | null | undefined): string => {
    if (!time) return "09:00";
    const trimmed = time.trim();
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      const parts = trimmed.split(":");
      return `${parts[0].padStart(2, "0")}:${parts[1]}`;
    }
    if (/^\d{1,2}$/.test(trimmed)) return `${trimmed.padStart(2, "0")}:00`;
    const match = trimmed.match(/(\d{1,2})[:\s]?(\d{2})?/);
    return match ? `${(match[1] || "09").padStart(2, "0")}:${match[2] || "00"}` : "09:00";
  };

  const jobToCalendarEvent = useCallback((job: Job | CalendarEventData) => {
    const calendarId = getSelectedCalendarId();
    if ("jobId" in job) {
      return {
        summary: job.title,
        description: job.description || "",
        location: job.location || "",
        startDateTime: job.startDateTime,
        endDateTime: job.endDateTime,
        calendarId,
      };
    }

    const startDate = job.scheduled_date || new Date().toISOString().split("T")[0];
    const startTime = normalizeTime(job.scheduled_time);
    const durationMinutes = job.duration_minutes || 120;
    const dateTimeString = `${startDate}T${startTime}:00`;
    let startDateTime = new Date(dateTimeString);
    if (Number.isNaN(startDateTime.getTime())) {
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

  const syncJobToCalendar = useCallback(async (job: Job): Promise<string | null> => {
    if (!canSync()) return null;
    try {
      await ensureCalendarStateLoaded();
      const eventData = jobToCalendarEvent(job);
      const result = await createEvent(eventData);
      if (!result?.id) return null;
      await persistMapping("job", job.id, eventData.calendarId, result.id);
      toast.success("Job sincronizado com Google Calendar!");
      return result.id;
    } catch (error: unknown) {
      console.error("Failed to sync job to calendar:", error);
      toast.error(`Falha ao sincronizar com Calendar: ${getErrorMessage(error, "Erro desconhecido")}`);
      return null;
    }
  }, [canSync, createEvent, jobToCalendarEvent]);

  const updateJobInCalendar = useCallback(async (job: Job): Promise<boolean> => {
    if (!canSync()) return false;
    try {
      await ensureCalendarStateLoaded();
      const mapping = eventMap.get(mappingKey("job", job.id));
      if (!mapping) return (await syncJobToCalendar(job)) !== null;

      const eventData = jobToCalendarEvent(job);
      await updateEvent({
        eventId: mapping.eventId,
        summary: eventData.summary,
        description: eventData.description,
        location: eventData.location,
        startDateTime: eventData.startDateTime,
        endDateTime: eventData.endDateTime,
        calendarId: mapping.calendarId,
      });
      await persistMapping("job", job.id, mapping.calendarId, mapping.eventId);
      toast.success("Evento do Calendar atualizado!");
      return true;
    } catch (error: unknown) {
      const message = getErrorMessage(error, "");
      console.error("Failed to update calendar event:", error);
      if (message.includes("404") || message.includes("Not Found")) {
        await clearMapping("job", job.id);
        return (await syncJobToCalendar(job)) !== null;
      }
      toast.error(`Falha ao atualizar evento: ${getErrorMessage(error, "Erro desconhecido")}`);
      return false;
    }
  }, [canSync, updateEvent, jobToCalendarEvent, syncJobToCalendar]);

  const deleteJobFromCalendar = useCallback(async (jobId: string): Promise<boolean> => {
    if (!canSync()) return false;
    try {
      await ensureCalendarStateLoaded();
      const mapping = eventMap.get(mappingKey("job", jobId));
      if (!mapping) return true;
      await deleteEvent(mapping.eventId, mapping.calendarId);
      await clearMapping("job", jobId);
      toast.success("Evento removido do Calendar");
      return true;
    } catch (error: unknown) {
      const message = getErrorMessage(error, "");
      console.error("Failed to delete calendar event:", error);
      if (message.includes("404") || message.includes("Not Found")) {
        await clearMapping("job", jobId);
        return true;
      }
      return false;
    }
  }, [canSync, deleteEvent]);

  const hasCalendarEvent = useCallback((jobId: string): boolean => eventMap.has(mappingKey("job", jobId)), []);
  const getCalendarEventId = useCallback((jobId: string): string | null => eventMap.get(mappingKey("job", jobId))?.eventId || null, []);

  const syncMultipleJobsToCalendar = useCallback(async (
    jobs: Job[],
    onProgress?: (current: number, total: number) => void,
  ): Promise<{ synced: number; failed: number; errors: string[] }> => {
    if (!canSync()) return { synced: 0, failed: 0, errors: ["Google Calendar não está conectado"] };
    await ensureCalendarStateLoaded();
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      try {
        if (!job.scheduled_date || eventMap.has(mappingKey("job", job.id))) {
          synced++;
        } else {
          const eventData = jobToCalendarEvent(job);
          const result = await createEvent(eventData);
          if (result?.id) {
            await persistMapping("job", job.id, eventData.calendarId, result.id);
            synced++;
          } else if (result?.error) {
            errors.push(`Job "${job.title}": ${result.error.message || result.error}`);
            failed++;
          } else {
            synced++;
          }
        }
      } catch (error: unknown) {
        errors.push(`Job "${job.title}": ${getErrorMessage(error, "Erro desconhecido")}`);
        failed++;
      }
      onProgress?.(i + 1, jobs.length);
      if (i < jobs.length - 1) await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return { synced, failed, errors };
  }, [canSync, createEvent, jobToCalendarEvent]);

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
    if (!canSync()) return null;
    try {
      await ensureCalendarStateLoaded();
      if (!leadsCalendarId) return null;
      const startTime = normalizeTime(leadData.time);
      const dateTimeString = `${leadData.date}T${startTime}:00`;
      let startDateTime = new Date(dateTimeString);
      if (Number.isNaN(startDateTime.getTime())) {
        startDateTime = new Date();
        startDateTime.setHours(9, 0, 0, 0);
      }
      const endDateTime = new Date(startDateTime.getTime() + (leadData.durationMinutes || 60) * 60 * 1000);
      const calendarId = leadsCalendarId;
      const result = await createEvent({
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
        calendarId,
      });
      if (!result?.id) return null;
      await persistMapping("lead", leadData.id, calendarId, result.id);
      toast.success("Lead sincronizado com Google Calendar!");
      return result.id;
    } catch (error: unknown) {
      console.error("Failed to sync lead to calendar:", error);
      toast.error(`Falha ao sincronizar lead: ${getErrorMessage(error, "Erro desconhecido")}`);
      return null;
    }
  }, [canSync, createEvent]);

  const hasLeadsCalendar = useCallback(() => !!getLeadsCalendarId(), []);

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
    syncLeadToCalendar,
    hasLeadsCalendar,
    getLeadsCalendarId,
    setLeadsCalendarId,
  };
}
