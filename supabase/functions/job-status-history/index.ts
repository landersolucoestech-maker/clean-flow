import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface JobStatusHistoryRequest {
  jobId: string;
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Backend not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: JobStatusHistoryRequest = await req.json();
    const { jobId } = body;

    if (!jobId || !uuidRegex.test(jobId)) {
      return new Response(
        JSON.stringify({ error: "Invalid jobId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: trackingData, error: trackingError } = await supabase
      .from("job_status_tracking")
      .select("*")
      .eq("job_id", jobId)
      .order("triggered_at", { ascending: true });

    if (trackingError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch tracking", details: trackingError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch job address (for map fallback)
    let jobAddress: string | null = null;
    const { data: jobData, error: jobError } = await supabase
      .from("jobs")
      .select("address")
      .eq("id", jobId)
      .maybeSingle();

    if (!jobError) {
      jobAddress = jobData?.address ?? null;
    }

    const tracking = trackingData ?? [];

    const staffIds = [...new Set([
      ...tracking.map((t) => t.triggered_by).filter(Boolean),
      ...tracking.map((t) => t.edited_by).filter(Boolean),
    ])] as string[];

    let staffMap: Record<string, string> = {};
    if (staffIds.length > 0) {
      const { data: staffData } = await supabase
        .from("staff")
        .select("id, name")
        .in("id", staffIds);

      if (staffData) {
        staffMap = Object.fromEntries(staffData.map((s) => [s.id, s.name]));
      }
    }

    const enriched = tracking.map((record) => ({
      ...record,
      triggered_by_staff: record.triggered_by
        ? { id: record.triggered_by, name: staffMap[record.triggered_by] || "Unknown" }
        : null,
      edited_by_staff: record.edited_by
        ? { id: record.edited_by, name: staffMap[record.edited_by] || "Unknown" }
        : null,
    }));

    return new Response(
      JSON.stringify({ history: enriched, jobAddress }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in job-status-history:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
