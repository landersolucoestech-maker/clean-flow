import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { getAuthorizedStaffIdentity } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface JobStatusHistoryRequest { jobId: string }
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Backend not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authorization = await getAuthorizedStaffIdentity(req, supabase, [
      "admin", "cleaner", "driver", "cleaning_manager", "office_manager", "virtual_assistant",
    ]);
    if (authorization.error) return authorization.error;

    const { jobId }: JobStatusHistoryRequest = await req.json();
    if (!jobId || !uuidRegex.test(jobId)) {
      return new Response(JSON.stringify({ error: "Invalid jobId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const companyId = authorization.identity.companyId;
    const { data: jobData, error: jobError } = await supabase
      .from("jobs")
      .select("address, staff_assigned, company_id")
      .eq("id", jobId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (jobError || !jobData) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const managementRoles = ["admin", "cleaning_manager", "office_manager", "virtual_assistant"];
    if (!managementRoles.includes(authorization.identity.role)) {
      const { data: currentStaff, error: staffError } = await supabase
        .from("staff")
        .select("name, team")
        .eq("id", authorization.identity.staffId)
        .eq("company_id", companyId)
        .single();
      if (staffError || !currentStaff) {
        return new Response(JSON.stringify({ error: "Staff identity not found" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const assigned = (jobData.staff_assigned ?? []) as string[];
      const normalizedTeam = currentStaff.team?.trim().toLowerCase();
      const normalizedName = currentStaff.name?.trim().toLowerCase();
      const isAssigned = assigned.some((value) => {
        const normalized = value.trim().toLowerCase();
        return normalized === authorization.identity.staffId.toLowerCase()
          || normalized === normalizedName
          || (normalizedTeam != null && (normalized === normalizedTeam || normalized === `team ${normalizedTeam}`));
      });
      if (!isAssigned) {
        return new Response(JSON.stringify({ error: "You are not assigned to this job", code: "PERMISSION_DENIED" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Tracking inherits tenant ownership from the already-validated job parent.
    const { data: trackingData, error: trackingError } = await supabase
      .from("job_status_tracking")
      .select("*")
      .eq("job_id", jobId)
      .order("triggered_at", { ascending: true });

    if (trackingError) {
      return new Response(JSON.stringify({ error: "Failed to fetch tracking", details: trackingError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tracking = trackingData ?? [];
    const staffIds = [...new Set([
      ...tracking.map((record) => record.triggered_by).filter(Boolean),
      ...tracking.map((record) => record.edited_by).filter(Boolean),
    ])] as string[];

    let staffMap: Record<string, string> = {};
    if (staffIds.length > 0) {
      const { data: staffData, error: staffLookupError } = await supabase
        .from("staff")
        .select("id, name")
        .eq("company_id", companyId)
        .in("id", staffIds);
      if (staffLookupError) throw staffLookupError;
      staffMap = Object.fromEntries((staffData || []).map((staff) => [staff.id, staff.name]));
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

    return new Response(JSON.stringify({ history: enriched, jobAddress: jobData.address ?? null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in job-status-history:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
