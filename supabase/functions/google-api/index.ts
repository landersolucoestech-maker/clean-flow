import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, accessToken, data } = await req.json();

    if (!accessToken) {
      throw new Error("Access token is required");
    }

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    // ==================== CALENDAR ACTIONS ====================
    if (action === "list-calendars") {
      const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
        headers,
      });
      const result = await response.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list-events") {
      const calendarId = data?.calendarId || "primary";
      const timeMin = data?.timeMin || new Date().toISOString();
      const timeMax = data?.timeMax;
      const maxResults = data?.maxResults || 50;

      let url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`;
      
      if (timeMax) {
        url += `&timeMax=${encodeURIComponent(timeMax)}`;
      }

      const response = await fetch(url, { headers });
      const result = await response.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create-event") {
      const calendarId = data?.calendarId || "primary";
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            summary: data.summary,
            description: data.description,
            location: data.location,
            start: {
              dateTime: data.startDateTime,
              timeZone: data.timeZone || "America/New_York",
            },
            end: {
              dateTime: data.endDateTime,
              timeZone: data.timeZone || "America/New_York",
            },
            attendees: data.attendees?.map((email: string) => ({ email })),
            reminders: data.reminders || {
              useDefault: true,
            },
          }),
        }
      );
      const result = await response.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update-event") {
      const calendarId = data?.calendarId || "primary";
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${data.eventId}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({
            summary: data.summary,
            description: data.description,
            location: data.location,
            start: {
              dateTime: data.startDateTime,
              timeZone: data.timeZone || "America/New_York",
            },
            end: {
              dateTime: data.endDateTime,
              timeZone: data.timeZone || "America/New_York",
            },
            attendees: data.attendees?.map((email: string) => ({ email })),
          }),
        }
      );
      const result = await response.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete-event") {
      const calendarId = data?.calendarId || "primary";
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${data.eventId}`,
        {
          method: "DELETE",
          headers,
        }
      );
      
      if (response.status === 204) {
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const result = await response.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== USER INFO ====================
    if (action === "get-user-info") {
      const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers,
      });
      const result = await response.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Google API Error:", error);
    const message = error instanceof Error ? error.message : "Unknown Google API error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
