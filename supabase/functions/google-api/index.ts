import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { getAuthorizedStaffIdentity } from "../_shared/authorize.ts";
import { getGoogleConnection } from "../_shared/google.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function googleJson(response: Response): Promise<Response> {
  if (response.status === 204) return json({ success: true });
  const payload = await response.json().catch(() => ({ error: { message: "Invalid Google response" } }));
  if (!response.ok) {
    const message = payload?.error?.message || `Google API request failed (${response.status})`;
    console.error("Google API request failed", response.status, message);
    return json({ error: message, provider_status: response.status }, response.status >= 400 && response.status < 600 ? response.status : 502);
  }
  return json(payload);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const authorization = await getAuthorizedStaffIdentity(
      req,
      adminClient,
      ["admin", "cleaning_manager", "office_manager", "virtual_assistant"],
    );
    if (authorization.error) return authorization.error;

    const { action, data } = await req.json();
    const connection = await getGoogleConnection(adminClient, authorization.identity.companyId);
    const headers = {
      Authorization: `Bearer ${connection.access_token}`,
      "Content-Type": "application/json",
    };

    if (action === "list-calendars") {
      return googleJson(await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", { headers }));
    }

    if (action === "list-events") {
      const calendarId = data?.calendarId || "primary";
      const timeMin = data?.timeMin || new Date().toISOString();
      const timeMax = data?.timeMax;
      const maxResults = Math.min(Math.max(Number(data?.maxResults || 50), 1), 2500);
      let url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`;
      if (timeMax) url += `&timeMax=${encodeURIComponent(timeMax)}`;
      return googleJson(await fetch(url, { headers }));
    }

    if (action === "create-event") {
      if (!data?.startDateTime || !data?.endDateTime) return json({ error: "Event start and end are required" }, 400);
      const calendarId = data?.calendarId || "primary";
      return googleJson(await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            summary: data.summary,
            description: data.description,
            location: data.location,
            start: { dateTime: data.startDateTime, timeZone: data.timeZone || "America/New_York" },
            end: { dateTime: data.endDateTime, timeZone: data.timeZone || "America/New_York" },
            attendees: data.attendees?.map((email: string) => ({ email })),
            reminders: data.reminders || { useDefault: true },
          }),
        },
      ));
    }

    if (action === "update-event") {
      if (!data?.eventId || !data?.startDateTime || !data?.endDateTime) {
        return json({ error: "eventId, startDateTime and endDateTime are required" }, 400);
      }
      const calendarId = data?.calendarId || "primary";
      return googleJson(await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(data.eventId)}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({
            summary: data.summary,
            description: data.description,
            location: data.location,
            start: { dateTime: data.startDateTime, timeZone: data.timeZone || "America/New_York" },
            end: { dateTime: data.endDateTime, timeZone: data.timeZone || "America/New_York" },
            attendees: data.attendees?.map((email: string) => ({ email })),
          }),
        },
      ));
    }

    if (action === "delete-event") {
      if (!data?.eventId) return json({ error: "eventId is required" }, 400);
      const calendarId = data?.calendarId || "primary";
      return googleJson(await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(data.eventId)}`,
        { method: "DELETE", headers },
      ));
    }

    if (action === "get-user-info") {
      return googleJson(await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers }));
    }

    return json({ error: "Invalid action" }, 400);
  } catch (error: unknown) {
    console.error("Google API Error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown Google API error" }, 500);
  }
});
