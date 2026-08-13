import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/app/infrastructure/supabase/client";

export type CalendarEntityType = "job" | "lead";

export interface CalendarPreferences {
  selectedCalendarId: string;
  leadsCalendarId: string;
}

export interface CalendarMapping {
  entityType: CalendarEntityType;
  entityId: string;
  calendarId: string;
  eventId: string;
}

type CalendarDatabase = {
  public: {
    Tables: {
      google_calendar_preferences: {
        Row: { auth_user_id: string; company_id: string; selected_calendar_id: string; leads_calendar_id: string | null; created_at: string; updated_at: string };
        Insert: { auth_user_id: string; company_id: string; selected_calendar_id?: string; leads_calendar_id?: string | null; created_at?: string; updated_at?: string };
        Update: { company_id?: string; selected_calendar_id?: string; leads_calendar_id?: string | null; updated_at?: string };
        Relationships: [];
      };
      google_calendar_mappings: {
        Row: { id: string; company_id: string; entity_type: CalendarEntityType; entity_id: string; calendar_id: string; event_id: string; last_synced_at: string; created_at: string; updated_at: string };
        Insert: { id?: string; company_id: string; entity_type: CalendarEntityType; entity_id: string; calendar_id: string; event_id: string; last_synced_at?: string; created_at?: string; updated_at?: string };
        Update: { calendar_id?: string; event_id?: string; last_synced_at?: string; updated_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: { current_company_id: { Args: Record<PropertyKey, never>; Returns: string | null } };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const calendarDb = supabase as unknown as SupabaseClient<CalendarDatabase>;

async function requireContext(): Promise<{ userId: string; companyId: string }> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Authenticated user required for calendar state");
  const { data: companyId, error: companyError } = await calendarDb.rpc("current_company_id");
  if (companyError || !companyId) throw new Error("Company context required for calendar state");
  return { userId: userData.user.id, companyId };
}

export async function loadCalendarState(): Promise<{ preferences: CalendarPreferences; mappings: CalendarMapping[] }> {
  const { userId, companyId } = await requireContext();
  const [preferencesResult, mappingsResult] = await Promise.all([
    calendarDb.from("google_calendar_preferences").select("selected_calendar_id, leads_calendar_id").eq("auth_user_id", userId).eq("company_id", companyId).maybeSingle(),
    calendarDb.from("google_calendar_mappings").select("entity_type, entity_id, calendar_id, event_id").eq("company_id", companyId),
  ]);
  if (preferencesResult.error) throw preferencesResult.error;
  if (mappingsResult.error) throw mappingsResult.error;
  return {
    preferences: {
      selectedCalendarId: preferencesResult.data?.selected_calendar_id || "primary",
      leadsCalendarId: preferencesResult.data?.leads_calendar_id || "",
    },
    mappings: (mappingsResult.data || []).map((mapping) => ({
      entityType: mapping.entity_type,
      entityId: mapping.entity_id,
      calendarId: mapping.calendar_id,
      eventId: mapping.event_id,
    })),
  };
}

export async function saveCalendarPreferences(preferences: CalendarPreferences): Promise<void> {
  const { userId, companyId } = await requireContext();
  const { error } = await calendarDb.from("google_calendar_preferences").upsert({
    auth_user_id: userId,
    company_id: companyId,
    selected_calendar_id: preferences.selectedCalendarId || "primary",
    leads_calendar_id: preferences.leadsCalendarId || null,
  }, { onConflict: "auth_user_id" });
  if (error) throw error;
}

export async function saveCalendarMapping(mapping: CalendarMapping): Promise<void> {
  const { companyId } = await requireContext();
  const { error } = await calendarDb.from("google_calendar_mappings").upsert({
    company_id: companyId,
    entity_type: mapping.entityType,
    entity_id: mapping.entityId,
    calendar_id: mapping.calendarId,
    event_id: mapping.eventId,
    last_synced_at: new Date().toISOString(),
  }, { onConflict: "company_id,entity_type,entity_id" });
  if (error) throw error;
}

export async function removeCalendarMapping(entityType: CalendarEntityType, entityId: string): Promise<void> {
  const { companyId } = await requireContext();
  const { error } = await calendarDb.from("google_calendar_mappings").delete().eq("company_id", companyId).eq("entity_type", entityType).eq("entity_id", entityId);
  if (error) throw error;
}
