import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";
import { getAuthorizedStaffIdentity } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type StatusType = "on_our_way" | "cleaning_now" | "cleaning_done";
type TrackStatusRequest = {
  jobId: string;
  statusType: StatusType;
  staffId?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  deviceInfo?: Record<string, unknown>;
  isManualEdit?: boolean;
  previousValue?: string;
};

type StaffIdentity = {
  id: string;
  name: string;
  team: string | null;
};

type PayrollStaff = {
  id: string;
  name: string;
  payment_method: string | null;
  team: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function coordinates(latitude: unknown, longitude: unknown): { lat: number; lon: number } | null {
  if (
    typeof latitude !== "number" || !Number.isFinite(latitude)
    || typeof longitude !== "number" || !Number.isFinite(longitude)
  ) return null;
  return { lat: latitude, lon: longitude };
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radius = 6_371_000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodeAddress(address: string, apiKey: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const response = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address)}&apiKey=${apiKey}`);
    if (!response.ok) return null;
    const payload = await response.json();
    const found = payload.features?.[0]?.geometry?.coordinates;
    return Array.isArray(found) && found.length >= 2
      ? { lon: Number(found[0]), lat: Number(found[1]) }
      : null;
  } catch {
    return null;
  }
}

async function reverseGeocode(lat: number, lon: number, apiKey: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${apiKey}`);
    if (!response.ok) return null;
    const payload = await response.json();
    return typeof payload.features?.[0]?.properties?.formatted === "string"
      ? payload.features[0].properties.formatted
      : null;
  } catch {
    return null;
  }
}

function newYorkClock(): { timestamp: string; time: string; date: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value || "00";
  const date = `${part("year")}-${part("month")}-${part("day")}`;
  const time = `${part("hour")}:${part("minute")}:${part("second")}`;
  return { timestamp: `${date}T${time}`, time, date };
}

function isAssigned(jobAssignments: string[] | null, staff: StaffIdentity): boolean {
  const team = staff.team?.trim().toLowerCase();
  return (jobAssignments || []).some((value) => {
    const normalized = value.trim().toLowerCase();
    return normalized === staff.id.toLowerCase()
      || normalized === staff.name.trim().toLowerCase()
      || (!!team && (normalized === team || normalized === `team ${team}`));
  });
}

async function sendGpsAlert(
  supabaseUrl: string,
  serviceRoleKey: string,
  companyId: string,
  phone: string,
  message: string,
): Promise<void> {
  const response = await fetch(`${supabaseUrl}/functions/v1/send-sms-message`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
    body: JSON.stringify({ company_id: companyId, to_phone: phone, message }),
  });
  await response.body?.cancel();
  if (!response.ok) console.error("GPS alert SMS delivery failed", response.status);
}

async function resolvePayrollStaff(
  supabase: SupabaseClient,
  companyId: string,
  assignments: string[],
): Promise<PayrollStaff[]> {
  const resolved: PayrollStaff[] = [];
  for (const raw of assignments) {
    const identifier = raw.trim();
    if (!identifier) continue;

    if (UUID_RE.test(identifier)) {
      const { data } = await supabase
        .from("staff")
        .select("id, name, payment_method, team")
        .eq("company_id", companyId)
        .eq("id", identifier)
        .eq("is_active", true)
        .maybeSingle();
      if (data) resolved.push(data as PayrollStaff);
      continue;
    }

    const teamMatch = identifier.match(/^team\s+(.+)$/i);
    const teamValue = teamMatch?.[1] || (/^\d+$/.test(identifier) ? identifier : null);
    if (teamValue) {
      const { data } = await supabase
        .from("staff")
        .select("id, name, payment_method, team")
        .eq("company_id", companyId)
        .eq("team", teamValue)
        .eq("is_active", true);
      resolved.push(...((data || []) as PayrollStaff[]));
      continue;
    }

    const { data } = await supabase
      .from("staff")
      .select("id, name, payment_method, team")
      .eq("company_id", companyId)
      .ilike("name", identifier)
      .eq("is_active", true);
    resolved.push(...((data || []) as PayrollStaff[]));
  }

  return [...new Map(resolved.map((staff) => [staff.id, staff])).values()];
}

async function generatePayroll(
  supabase: SupabaseClient,
  companyId: string,
  jobId: string,
  fallbackDate: string,
): Promise<void> {
  const { data: job, error } = await supabase
    .from("jobs")
    .select("id, service_type, scheduled_date, staff_assigned, customer:customers(name)")
    .eq("company_id", companyId)
    .eq("id", jobId)
    .maybeSingle();
  if (error || !job || !job.staff_assigned?.length) return;

  const staffMembers = await resolvePayrollStaff(supabase, companyId, job.staff_assigned as string[]);
  if (!staffMembers.length) return;

  const { data: existing } = await supabase
    .from("payroll_records")
    .select("staff_id")
    .eq("company_id", companyId)
    .eq("job_id", jobId);
  const existingIds = new Set((existing || []).map((record) => record.staff_id).filter(Boolean));
  const jobDate = job.scheduled_date || fallbackDate;
  const customerData = Array.isArray(job.customer) ? job.customer[0] : job.customer;
  const customerName = customerData?.name || "Unknown Customer";

  for (const staff of staffMembers) {
    if (existingIds.has(staff.id)) continue;
    const { data: rule } = await supabase
      .from("payroll_rules")
      .select("base_value, extra_value")
      .eq("company_id", companyId)
      .eq("staff_id", staff.id)
      .maybeSingle();
    const baseValue = Number(rule?.base_value || 0);
    const bonus = Number(rule?.extra_value || 0);

    const { error: insertError } = await supabase.from("payroll_records").insert({
      company_id: companyId,
      employee_name: staff.name,
      staff_id: staff.id,
      job_id: jobId,
      base_value: baseValue,
      bonus,
      total: baseValue + bonus,
      period_start: jobDate,
      period_end: jobDate,
      payment_type: staff.payment_method || "Direct Deposit",
      status: "Pending",
      client: customerName,
      cleaning_type: job.service_type || "Standard",
      notes: `Job ${jobId.slice(0, 8).toUpperCase()} • ${jobDate}`,
    });
    if (insertError) console.error("Payroll generation failed", insertError);
  }
}

async function generateBalanceInvoice(
  supabase: SupabaseClient,
  companyId: string,
  jobId: string,
  fallbackDate: string,
): Promise<void> {
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, amount, service_type, customer_id, lead_id")
    .eq("company_id", companyId)
    .eq("id", jobId)
    .maybeSingle();
  if (jobError || !job?.lead_id) return;

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, total, title, customer_id, service_type")
    .eq("company_id", companyId)
    .eq("id", job.lead_id)
    .maybeSingle();
  if (leadError || !lead) return;

  const serviceType = String(lead.service_type || lead.title || job.service_type || "").toLowerCase();
  if (!["deep", "primeira", "first", "inicial"].some((term) => serviceType.includes(term))) return;

  const { data: existing } = await supabase
    .from("invoices")
    .select("id")
    .eq("company_id", companyId)
    .eq("lead_id", lead.id)
    .eq("invoice_type", "balance")
    .maybeSingle();
  if (existing) return;

  const { data: paidInvoices } = await supabase
    .from("invoices")
    .select("total, amount_paid")
    .eq("company_id", companyId)
    .eq("lead_id", lead.id)
    .eq("status", "paid");
  const paidAmount = (paidInvoices || []).reduce(
    (sum, invoice) => sum + Number(invoice.amount_paid || invoice.total || 0),
    0,
  );
  const remaining = Math.max(0, Number(lead.total || job.amount || 0) - paidAmount);
  if (remaining <= 0) return;

  const { data: nextNumber, error: numberError } = await supabase.rpc("next_invoice_number");
  if (numberError || typeof nextNumber !== "string") {
    console.error("Unable to allocate balance invoice number", numberError);
    return;
  }

  const issueDate = fallbackDate;
  const dueDate = new Date(`${fallbackDate}T12:00:00Z`);
  dueDate.setUTCDate(dueDate.getUTCDate() + 7);

  const { error: invoiceError } = await supabase.from("invoices").insert({
    company_id: companyId,
    invoice_number: nextNumber,
    customer_id: job.customer_id,
    lead_id: lead.id,
    job_id: jobId,
    status: "sent",
    subtotal: remaining,
    total: remaining,
    amount_paid: 0,
    issue_date: issueDate,
    due_date: dueDate.toISOString().slice(0, 10),
    notes: `Valor restante - ${lead.title || job.service_type || "Serviço"} (Job concluído)`,
    invoice_type: "balance",
    auto_generated: true,
  });
  if (invoiceError) console.error("Balance invoice generation failed", invoiceError);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const geoapifyApiKey = Deno.env.get("GEOAPIFY_API_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Backend not configured" }, 503);
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authorization = await getAuthorizedStaffIdentity(req, supabase, [
      "admin", "cleaner", "driver", "cleaning_manager", "office_manager", "virtual_assistant",
    ]);
    if (authorization.error) return authorization.error;
    const companyId = authorization.identity.companyId;

    const body = await req.json() as TrackStatusRequest;
    const { jobId, statusType, staffId, latitude, longitude, accuracy, deviceInfo, isManualEdit = false, previousValue } = body;
    if (!jobId || !["on_our_way", "cleaning_now", "cleaning_done"].includes(statusType)) {
      return json({ error: "Valid jobId and statusType are required" }, 400);
    }

    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("id, name, team")
      .eq("company_id", companyId)
      .eq("id", authorization.identity.staffId)
      .eq("is_active", true)
      .maybeSingle();
    if (staffError || !staff) return json({ error: "Active staff identity not found", code: "STAFF_IDENTITY_REQUIRED" }, 403);
    if (staffId && staffId !== staff.id) return json({ error: "Staff identity mismatch", code: "PERMISSION_DENIED" }, 403);

    const role = authorization.identity.role;
    const canEdit = ["admin", "virtual_assistant", "office_manager", "cleaning_manager"].includes(role);
    const canTrigger = canEdit || role === "driver" || role === "cleaner";
    if (!canTrigger) return json({ error: "Your role cannot update job status", code: "PERMISSION_DENIED" }, 403);
    if (isManualEdit && !canEdit) return json({ error: "Your role cannot manually edit status times", code: "PERMISSION_DENIED" }, 403);

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, title, address, customer_id, status, staff_assigned, customer:customers(name, address)")
      .eq("company_id", companyId)
      .eq("id", jobId)
      .maybeSingle();
    if (jobError || !job) return json({ error: "Job not found", code: "NOT_FOUND" }, 404);

    if (!canEdit) {
      if (!isAssigned(job.staff_assigned as string[] | null, staff as StaffIdentity)) {
        return json({ error: "You are not assigned to this job", code: "PERMISSION_DENIED" }, 403);
      }
      const allowed: Record<StatusType, string[]> = {
        on_our_way: ["scheduled"],
        cleaning_now: ["on-the-way"],
        cleaning_done: ["in-progress"],
      };
      if (!allowed[statusType].includes(job.status)) {
        return json({ error: "Invalid status transition", code: "INVALID_TRANSITION" }, 409);
      }
    }

    const clock = newYorkClock();
    const gps = coordinates(latitude, longitude);
    let addressResolved: string | null = null;
    let distanceWarning: { distance: number; threshold: number; message: string } | null = null;

    const { data: settings } = await supabase
      .from("company_settings")
      .select("gps_distance_threshold, gps_alert_sms_enabled, gps_alert_sms_to")
      .eq("id", companyId)
      .maybeSingle();
    const threshold = Number(settings?.gps_distance_threshold || 500);

    if (gps && geoapifyApiKey) {
      addressResolved = await reverseGeocode(gps.lat, gps.lon, geoapifyApiKey);
      const customerData = Array.isArray(job.customer) ? job.customer[0] : job.customer;
      const jobAddress = job.address || customerData?.address || null;
      if (jobAddress) {
        const expected = await geocodeAddress(jobAddress, geoapifyApiKey);
        if (expected) {
          const distance = Math.round(calculateDistance(gps.lat, gps.lon, expected.lat, expected.lon));
          if (distance > threshold) {
            distanceWarning = {
              distance,
              threshold,
              message: `A localização GPS está ${distance}m distante do endereço do job (limite: ${threshold}m)`,
            };
            if (settings?.gps_alert_sms_enabled && settings.gps_alert_sms_to) {
              const customerName = customerData?.name || "Unknown";
              const label = statusType === "on_our_way" ? "A Caminho" : statusType === "cleaning_now" ? "Limpando" : "Concluído";
              await sendGpsAlert(
                supabaseUrl,
                serviceRoleKey,
                companyId,
                settings.gps_alert_sms_to,
                `⚠️ Alerta GPS: ${staff.name} marcou "${label}" a ${distance}m do endereço do job.\n\nCliente: ${customerName}\nLimite: ${threshold}m`,
              );
            }
          }
        }
      }
    }

    let previousTimestamp: string | null = null;
    if (previousValue) {
      const parsed = new Date(previousValue);
      if (!Number.isNaN(parsed.getTime())) previousTimestamp = parsed.toISOString();
    }

    const { data: tracking, error: trackingError } = await supabase.from("job_status_tracking").insert({
      job_id: jobId,
      status_type: statusType,
      triggered_by: staff.id,
      triggered_at: clock.timestamp,
      latitude: gps?.lat ?? null,
      longitude: gps?.lon ?? null,
      accuracy_meters: typeof accuracy === "number" && Number.isFinite(accuracy) ? accuracy : null,
      address_resolved: addressResolved,
      device_info: deviceInfo,
      is_manual_edit: isManualEdit,
      edited_by: isManualEdit ? staff.id : null,
      edited_at: isManualEdit ? clock.timestamp : null,
      previous_value: previousTimestamp,
      distance_from_job: distanceWarning?.distance || null,
    }).select().single();
    if (trackingError || !tracking) return json({ error: "Failed to record status tracking" }, 500);

    const jobUpdate: Record<string, unknown> = {
      status: statusType === "on_our_way" ? "on-the-way" : statusType === "cleaning_now" ? "in-progress" : "completed",
    };
    if (statusType === "on_our_way") jobUpdate.on_our_way_time = clock.time;
    if (statusType === "cleaning_now") jobUpdate.time_started = clock.time;
    if (statusType === "cleaning_done") jobUpdate.time_finished = clock.time;

    const { error: updateError } = await supabase
      .from("jobs")
      .update(jobUpdate)
      .eq("company_id", companyId)
      .eq("id", jobId);
    if (updateError) return json({ error: "Failed to update job status" }, 500);

    if (!isManualEdit) {
      const trigger = statusType === "on_our_way" ? "on_our_way" : statusType === "cleaning_now" ? "started" : "finished";
      const response = await fetch(`${supabaseUrl}/functions/v1/process-job-automations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({ job_id: jobId, trigger_type: trigger, company_id: companyId }),
      }).catch(() => null);
      await response?.body?.cancel();
      if (response && !response.ok) console.error("Job automation trigger failed", response.status);
    }

    if (statusType === "cleaning_done") {
      await generatePayroll(supabase, companyId, jobId, clock.date).catch((error) => console.error("Payroll generation failed", error));
      await generateBalanceInvoice(supabase, companyId, jobId, clock.date).catch((error) => console.error("Balance invoice generation failed", error));
    }

    return json({
      success: true,
      tracking,
      serverTimestamp: clock.timestamp,
      addressResolved,
      distanceWarning,
      permissions: { canEdit, canTrigger, role },
    });
  } catch (error) {
    console.error("Error in track-job-status:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
