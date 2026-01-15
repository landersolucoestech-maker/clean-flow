import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, accessToken, refreshToken, startDate, endDate, pageToken, pageSize } = await req.json();

    // Helper to refresh token if needed
    const refreshAccessToken = async (rToken: string): Promise<string> => {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: rToken,
          grant_type: "refresh_token",
        }),
      });
      const tokenData = await tokenResponse.json();
      if (tokenData.error) {
        throw new Error(tokenData.error_description || tokenData.error);
      }
      return tokenData.access_token;
    };

    let token = accessToken;

    // List Local Services accounts
    if (action === "list-accounts") {
      const response = await fetch(
        "https://localservices.googleapis.com/v1/accountReports",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.status === 401 && refreshToken) {
        token = await refreshAccessToken(refreshToken);
        const retryResponse = await fetch(
          "https://localservices.googleapis.com/v1/accountReports",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await retryResponse.json();
        return new Response(JSON.stringify({ ...data, newAccessToken: token }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get detailed leads (message leads)
    if (action === "list-leads") {
      const params = new URLSearchParams();
      if (startDate) params.append("query.startDate.year", new Date(startDate).getFullYear().toString());
      if (startDate) params.append("query.startDate.month", (new Date(startDate).getMonth() + 1).toString());
      if (startDate) params.append("query.startDate.day", new Date(startDate).getDate().toString());
      if (endDate) params.append("query.endDate.year", new Date(endDate).getFullYear().toString());
      if (endDate) params.append("query.endDate.month", (new Date(endDate).getMonth() + 1).toString());
      if (endDate) params.append("query.endDate.day", new Date(endDate).getDate().toString());
      if (pageToken) params.append("pageToken", pageToken);
      if (pageSize) params.append("pageSize", pageSize.toString());

      const url = `https://localservices.googleapis.com/v1/detailedLeadReports?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401 && refreshToken) {
        token = await refreshAccessToken(refreshToken);
        const retryResponse = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await retryResponse.json();
        return new Response(JSON.stringify({ ...data, newAccessToken: token }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get account report (aggregated metrics)
    if (action === "get-report") {
      const params = new URLSearchParams();
      if (startDate) {
        params.append("query.startDate.year", new Date(startDate).getFullYear().toString());
        params.append("query.startDate.month", (new Date(startDate).getMonth() + 1).toString());
        params.append("query.startDate.day", new Date(startDate).getDate().toString());
      }
      if (endDate) {
        params.append("query.endDate.year", new Date(endDate).getFullYear().toString());
        params.append("query.endDate.month", (new Date(endDate).getMonth() + 1).toString());
        params.append("query.endDate.day", new Date(endDate).getDate().toString());
      }

      const url = `https://localservices.googleapis.com/v1/accountReports?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401 && refreshToken) {
        token = await refreshAccessToken(refreshToken);
        const retryResponse = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await retryResponse.json();
        return new Response(JSON.stringify({ ...data, newAccessToken: token }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Google Local Services Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
