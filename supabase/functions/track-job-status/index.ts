import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAuthorizedStaffIdentity } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrackStatusRequest {
  jobId: string;
  statusType: "on_our_way" | "cleaning_now" | "cleaning_done";
  staffId?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  deviceInfo?: Record<string, unknown>;
  isManualEdit?: boolean;
  previousValue?: string;
}

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

// Geocode job address using Geoapify
async function geocodeAddress(address: string, apiKey: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address)}&apiKey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [lon, lat] = data.features[0].geometry.coordinates;
      return { lat, lon };
    }
  } catch (error) {
    console.error("Error geocoding address:", error);
  }
  return null;
}

// Reverse geocode coordinates to address using Geoapify
async function reverseGeocode(lat: number, lon: number, apiKey: string): Promise<string | null> {
  try {
    const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      return data.features[0].properties.formatted;
    }
  } catch (error) {
    console.error("Error reverse geocoding:", error);
  }
  return null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geoapifyApiKey = Deno.env.get("GEOAPIFY_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authorization = await getAuthorizedStaffIdentity(req, supabase, [
      "admin", "cleaner", "driver", "cleaning_manager", "office_manager", "virtual_assistant",
    ]);
    if (authorization.error) return authorization.error;

    const body: TrackStatusRequest = await req.json();
    const { 
      jobId, 
      statusType, 
      staffId, 
      latitude, 
      longitude, 
      accuracy, 
      deviceInfo,
      isManualEdit = false,
      previousValue
    } = body;

    // Validate required fields
    if (!jobId || !statusType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: jobId, statusType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: authenticatedStaff, error: staffError } = await supabase
      .from("staff")
      .select("id, name, team")
      .eq("id", authorization.identity.staffId)
      .eq("is_active", true)
      .single();

    if (staffError || !authenticatedStaff) {
      return new Response(
        JSON.stringify({ error: "Active staff identity not found", code: "STAFF_IDENTITY_REQUIRED" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (staffId && staffId !== authenticatedStaff.id) {
      return new Response(
        JSON.stringify({ error: "Staff identity mismatch", code: "PERMISSION_DENIED" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const role = authorization.identity.role;
    const staffIdUuid = authenticatedStaff.id;
    const canEdit = ["admin", "virtual_assistant", "office_manager", "cleaning_manager"].includes(role);
    const canTrigger = canEdit || ["driver", "cleaner"].includes(role);

    if (!canTrigger) {
      return new Response(
        JSON.stringify({ error: "Your role cannot update job status", code: "PERMISSION_DENIED" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: authorizedJob, error: authorizedJobError } = await supabase
      .from("jobs")
      .select("id, status, staff_assigned, on_our_way_time, time_started, time_finished")
      .eq("id", jobId)
      .single();

    if (authorizedJobError || !authorizedJob) {
      return new Response(
        JSON.stringify({ error: "Job not found", code: "NOT_FOUND" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!canEdit) {
      const assignedStaff = (authorizedJob.staff_assigned || []) as string[];
      const normalizedTeam = authenticatedStaff.team?.toLowerCase();
      const isAssigned = assignedStaff.some((identifier) => {
        const normalized = identifier.trim().toLowerCase();
        return normalized === authenticatedStaff.id.toLowerCase()
          || normalized === authenticatedStaff.name.toLowerCase()
          || (normalizedTeam != null
            && (normalized === normalizedTeam || normalized === `team ${normalizedTeam}`));
      });

      if (!isAssigned) {
        return new Response(
          JSON.stringify({ error: "You are not assigned to this job", code: "PERMISSION_DENIED" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const allowedCurrentStatus: Record<TrackStatusRequest["statusType"], string[]> = {
        on_our_way: ["scheduled"],
        cleaning_now: ["on-the-way"],
        cleaning_done: ["in-progress"],
      };
      if (!allowedCurrentStatus[statusType].includes(authorizedJob.status)) {
        return new Response(
          JSON.stringify({ error: "Invalid status transition", code: "INVALID_TRANSITION" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // If this is a manual edit, check permissions
    if (isManualEdit && !canEdit) {
      return new Response(
        JSON.stringify({ 
          error: "Permission denied: Your role cannot manually edit status times",
          code: "PERMISSION_DENIED"
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Server timestamp - always in New York timezone
    const serverDate = new Date();
    const nyFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = nyFormatter.formatToParts(serverDate);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '00';
    const serverTimestamp = `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
    const timeOnly = `${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;

    // Resolve address from coordinates using Geoapify
    let addressResolved: string | null = null;
    if (latitude && longitude && geoapifyApiKey) {
      addressResolved = await reverseGeocode(latitude, longitude, geoapifyApiKey);
    }

    // Distance validation - check if GPS location is too far from job address
    let distanceWarning: { distance: number; threshold: number; message: string } | null = null;
    
    // Fetch configurable threshold and SMS settings from company settings
    let DISTANCE_THRESHOLD_METERS = 500; // Default 500 meters threshold
    let gpsAlertSmsEnabled = false;
    let gpsAlertSmsTo: string | null = null;
    let companyId: string | null = null;
    
    const { data: companySettings } = await supabase
      .from("company_settings")
      .select("id, gps_distance_threshold, gps_alert_sms_enabled, gps_alert_sms_to")
      .limit(1)
      .single();
    
    if (companySettings) {
      companyId = companySettings.id;
      if (companySettings.gps_distance_threshold) {
        DISTANCE_THRESHOLD_METERS = companySettings.gps_distance_threshold;
      }
      gpsAlertSmsEnabled = companySettings.gps_alert_sms_enabled ?? false;
      gpsAlertSmsTo = companySettings.gps_alert_sms_to;
    }

    if (latitude && longitude && geoapifyApiKey) {
      // Get job address to compare
      const { data: jobData, error: jobFetchError } = await supabase
        .from("jobs")
        .select("address, customer_id, customers(address)")
        .eq("id", jobId)
        .single();

      if (!jobFetchError && jobData) {
        const jobAddress = jobData.address || (jobData.customers as { address?: string } | null)?.address;
        
        if (jobAddress) {
          const jobCoords = await geocodeAddress(jobAddress, geoapifyApiKey);
          
          if (jobCoords) {
            const distance = calculateDistance(latitude, longitude, jobCoords.lat, jobCoords.lon);
            
            if (distance > DISTANCE_THRESHOLD_METERS) {
              distanceWarning = {
                distance: Math.round(distance),
                threshold: DISTANCE_THRESHOLD_METERS,
                message: `A localização GPS está ${Math.round(distance)}m distante do endereço do job (limite: ${DISTANCE_THRESHOLD_METERS}m)`
              };
              console.warn(`Distance warning for job ${jobId}: ${distance}m from expected location`);
              
              // Send SMS alert if enabled
              if (gpsAlertSmsEnabled && gpsAlertSmsTo && companyId) {
                try {
                  // Get staff name for the alert
                  let staffName = "Unknown";
                  if (staffIdUuid) {
                    const { data: staffData } = await supabase
                      .from("staff")
                      .select("name")
                      .eq("id", staffIdUuid)
                      .single();
                    if (staffData) {
                      staffName = staffData.name;
                    }
                  }
                  
                  // Get customer name for context
                  const { data: jobInfo } = await supabase
                    .from("jobs")
                    .select("title, customers(name)")
                    .eq("id", jobId)
                    .single();
                  
                  const customerName = (jobInfo?.customers as { name?: string } | null)?.name || "Unknown";
                  const statusLabel = statusType === "on_our_way" ? "A Caminho" : 
                                      statusType === "cleaning_now" ? "Limpando" : "Concluído";
                  
                  const alertMessage = `⚠️ Alerta GPS: ${staffName} marcou "${statusLabel}" a ${Math.round(distance)}m do endereço do job.\n\nCliente: ${customerName}\nLimite: ${DISTANCE_THRESHOLD_METERS}m`;
                  
                  // Call RingCentral SMS function
                  await supabase.functions.invoke("ringcentral-send-message", {
                    body: {
                      company_id: companyId,
                      to_phone: gpsAlertSmsTo,
                      message: alertMessage,
                    },
                  });
                  
                  console.log("GPS alert SMS sent");
                } catch (smsError) {
                  console.error("Failed to send GPS alert SMS:", smsError);
                }
              }
            }
          }
        }
      }
    }

    // Insert tracking record
    const { data: trackingRecord, error: trackingError } = await supabase
      .from("job_status_tracking")
      .insert({
        job_id: jobId,
        status_type: statusType,
        triggered_by: staffIdUuid,
        triggered_at: serverTimestamp,
        latitude,
        longitude,
        accuracy_meters: accuracy,
        address_resolved: addressResolved,
        device_info: deviceInfo,
        is_manual_edit: isManualEdit,
        edited_by: isManualEdit ? staffIdUuid : null,
        edited_at: isManualEdit ? serverTimestamp : null,
        previous_value: previousValue ? new Date(previousValue).toISOString() : null,
        distance_from_job: distanceWarning?.distance || null,
      })
      .select()
      .single();

    if (trackingError) {
      console.error("Error inserting tracking record:", trackingError);
      return new Response(
        JSON.stringify({ error: "Failed to record status tracking", details: trackingError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the job with the new status and timestamp
    // Note: on_our_way_time, time_started, time_finished are TIME columns (HH:MM:SS format)
    // timeOnly is already computed above in NY timezone

    const jobUpdate: Record<string, unknown> = {
      status: statusType === "on_our_way" ? "on-the-way" :
              statusType === "cleaning_now" ? "in-progress" :
              "completed",
    };

    // Map status type to job field
    if (statusType === "on_our_way") {
      jobUpdate.on_our_way_time = timeOnly;
    } else if (statusType === "cleaning_now") {
      jobUpdate.time_started = timeOnly;
    } else if (statusType === "cleaning_done") {
      jobUpdate.time_finished = timeOnly;
    }

    const { error: jobError } = await supabase
      .from("jobs")
      .update(jobUpdate)
      .eq("id", jobId);

    if (jobError) {
      console.error("Error updating job:", jobError);
      return new Response(
        JSON.stringify({ error: "Failed to update job status", details: jobError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Trigger automation for this status change (only for non-manual edits)
    if (!isManualEdit) {
      const automationTrigger = statusType === "on_our_way" ? "on_our_way" :
                                 statusType === "cleaning_now" ? "started" :
                                 statusType === "cleaning_done" ? "finished" : null;
      
      if (automationTrigger) {
        try {
          const automationUrl = `${supabaseUrl}/functions/v1/process-job-automations`;
          const automationResponse = await fetch(automationUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              job_id: jobId,
              trigger_type: automationTrigger,
            }),
          });
          
          const automationResult = await automationResponse.json();
          console.log("Automation result:", automationResult);
        } catch (automationError) {
          console.error("Error triggering automation:", automationError);
          // Don't fail the main request if automation fails
        }
      }
    }

    // Auto-generate payroll records when job is completed
    if (statusType === "cleaning_done") {
      try {
        // Fetch job details including staff assignments, customer, and lead
        const { data: jobDetails, error: jobDetailsError } = await supabase
          .from("jobs")
          .select(`
            id,
            title,
            amount,
            service_type,
            scheduled_date,
            staff_assigned,
            customer_id,
            lead_id,
            customers(name, email, phone)
          `)
          .eq("id", jobId)
          .single();

        if (jobDetailsError) {
          console.error("Error fetching job details for payroll:", jobDetailsError);
        } else if (jobDetails && jobDetails.staff_assigned && jobDetails.staff_assigned.length > 0) {
          const staffAssigned = jobDetails.staff_assigned as string[];
          const jobDate = jobDetails.scheduled_date || serverTimestamp.split('T')[0];
          const customerName = (jobDetails.customers as { name?: string } | null)?.name || 'Unknown Customer';

          // Check for existing payroll records for this job to avoid duplicates
          const { data: existingPayroll, error: existingError } = await supabase
            .from("payroll_records")
            .select("id, staff_id")
            .eq("job_id", jobId);

          if (existingError) {
            console.error("Error checking existing payroll:", existingError);
          }

          const existingStaffIds = new Set((existingPayroll || []).map(p => p.staff_id));

          // Expand staff assignments to individual staff members
          // This handles: UUIDs, team numbers (expands to all team members), and names
          const resolvedStaffList: Array<{ id: string; name: string; payment_method: string | null; team: string | null }> = [];
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

          for (const staffIdentifier of staffAssigned) {
            if (uuidRegex.test(staffIdentifier)) {
              // It's a UUID, fetch directly
              const { data } = await supabase
                .from("staff")
                .select("id, name, payment_method, team")
                .eq("id", staffIdentifier)
                .eq("is_active", true)
                .single();
              if (data) {
                resolvedStaffList.push(data);
              }
            } else if (/^\d+$/.test(staffIdentifier)) {
              // It's a team number - expand to ALL individual staff members in the team
              const { data: teamMembers } = await supabase
                .from("staff")
                .select("id, name, payment_method, team")
                .eq("team", staffIdentifier)
                .eq("is_active", true);
              
              if (teamMembers && teamMembers.length > 0) {
                resolvedStaffList.push(...teamMembers);
                console.log(`Expanded assigned team to ${teamMembers.length} staff members`);
              }
            } else {
              // Try to find by name
              const { data: staffByName } = await supabase
                .from("staff")
                .select("id, name, payment_method, team")
                .ilike("name", `%${staffIdentifier}%`)
                .eq("is_active", true);
              
              if (staffByName && staffByName.length > 0) {
                resolvedStaffList.push(...staffByName);
              }
            }
          }

          // Remove duplicates by staff ID
          const uniqueStaffMap = new Map(resolvedStaffList.map(s => [s.id, s]));
          const uniqueStaffList = Array.from(uniqueStaffMap.values());

          console.log(`Processing ${uniqueStaffList.length} individual staff members for payroll`);

          // Create payroll for each individual staff member
          for (const staffData of uniqueStaffList) {

            // Skip if payroll already exists for this staff/job combination
            if (existingStaffIds.has(staffData.id)) {
              console.log(`Payroll record already exists for job ${jobId}`);
              continue;
            }

            // Fetch payroll rules for this staff
            const { data: payrollRules } = await supabase
              .from("payroll_rules")
              .select("base_value, extra_value")
              .eq("staff_id", staffData.id)
              .single();

            const baseValue = payrollRules?.base_value || 0;
            const extraValue = payrollRules?.extra_value || 0;

            // Create payroll record
            const { error: payrollError } = await supabase
              .from("payroll_records")
              .insert({
                employee_name: staffData.name,
                staff_id: staffData.id,
                job_id: jobId,
                base_value: baseValue,
                bonus: extraValue,
                total: baseValue + extraValue,
                period_start: jobDate,
                period_end: jobDate,
                payment_type: staffData.payment_method || 'Direct Deposit',
                status: 'Pending',
                client: customerName,
                cleaning_type: jobDetails.service_type || 'Standard',
                notes: `Job ${jobId.slice(0, 8).toUpperCase()} • ${jobDate}`,
              });

            if (payrollError) {
              console.error(`Error creating payroll for ${staffData.name}:`, payrollError);
            } else {
              console.log(`Created payroll record for job ${jobId}`);
            }
          }
        }
      } catch (payrollGenError) {
        console.error("Error generating payroll records:", payrollGenError);
        // Don't fail the main request if payroll generation fails
      }

      // Generate final invoice (remaining 50%) if this is the first job from a lead
      try {
        // Fetch job details including lead_id
        const { data: jobForInvoice, error: jobInvoiceError } = await supabase
          .from("jobs")
          .select(`
            id,
            amount,
            service_type,
            customer_id,
            lead_id,
            customers(name, email, phone)
          `)
          .eq("id", jobId)
          .single();

        if (jobInvoiceError) {
          console.error("Error fetching job for invoice:", jobInvoiceError);
        } else if (jobForInvoice?.lead_id) {
          // Check if this is the first job for this lead (only generate invoice once)
          const { data: leadData, error: leadError } = await supabase
            .from("leads")
            .select("id, total, title, customer_id, service_type")
            .eq("id", jobForInvoice.lead_id)
            .single();

          if (leadError) {
            console.error("Error fetching lead data:", leadError);
          } else if (leadData) {
            // Check if service is Deep Cleaning (only generate 50% final invoice for Deep Cleaning)
            const serviceType = (leadData.service_type || leadData.title || jobForInvoice.service_type || "").toLowerCase();
            const isDeepCleaning = serviceType.includes("deep") || 
                                   serviceType.includes("primeira") || 
                                   serviceType.includes("first") ||
                                   serviceType.includes("inicial");

            if (!isDeepCleaning) {
              console.log("Service is not Deep Cleaning, skipping balance invoice generation");
            } else {
              // Check if balance invoice already exists for this lead
              const { data: existingBalanceInvoice } = await supabase
                .from("invoices")
                .select("id")
                .eq("lead_id", leadData.id)
                .eq("invoice_type", "balance")
                .maybeSingle();

              if (!existingBalanceInvoice) {
                // Calculate remaining balance: total - sum of paid invoices
                const totalContractValue = leadData.total || jobForInvoice.amount || 0;
                
                // Get all paid invoices for this lead
                const { data: paidInvoices } = await supabase
                  .from("invoices")
                  .select("total, amount_paid, status")
                  .eq("lead_id", leadData.id)
                  .eq("status", "paid");

                let paidAmount = 0;
                paidInvoices?.forEach((inv) => {
                  paidAmount += inv.total || inv.amount_paid || 0;
                });

                const remainingBalance = Math.max(0, totalContractValue - paidAmount);
                
                
                if (remainingBalance > 0) {
                  // Get next invoice number
                  const { data: lastInvoice } = await supabase
                    .from("invoices")
                    .select("invoice_number")
                    .order("created_at", { ascending: false })
                    .limit(1);

                  let newInvoiceNumber = "INV-000001";
                  if (lastInvoice && lastInvoice.length > 0) {
                    const match = lastInvoice[0].invoice_number.match(/(\d+)$/);
                    if (match) {
                      const nextNum = parseInt(match[1], 10) + 1;
                      newInvoiceNumber = `INV-${String(nextNum).padStart(6, "0")}`;
                    }
                  }

                  const today = new Date().toISOString().split("T")[0];
                  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

                  const { error: invoiceError } = await supabase
                    .from("invoices")
                    .insert({
                      invoice_number: newInvoiceNumber,
                      customer_id: jobForInvoice.customer_id,
                      lead_id: leadData.id,
                      job_id: jobId,
                      status: "sent",
                      subtotal: remainingBalance,
                      total: remainingBalance,
                      issue_date: today,
                      due_date: dueDate,
                      notes: `Valor restante - ${leadData.title || jobForInvoice.service_type || "Serviço"} (Job concluído)`,
                      invoice_type: "balance",
                      auto_generated: true,
                    });

                  if (invoiceError) {
                    console.error("Error creating balance invoice:", invoiceError);
                  } else {
                    console.log("Created balance invoice");
                    
                    // Create pending transaction for this invoice
                    const customerName = (jobForInvoice.customers as { name?: string } | null)?.name || "Customer";
                    await supabase.from("transactions").insert({
                      name: `Invoice - ${customerName} (${newInvoiceNumber})`,
                      description: `Invoice ${newInvoiceNumber} - Valor restante`,
                      date: today,
                      category: "Cleaning Revenue",
                      status: "pendente",
                      amount: remainingBalance,
                      type: "receita",
                      service_type: jobForInvoice.service_type || null,
                    });
                  }
                } else {
                  console.log("No remaining balance to invoice - customer fully paid");
                }
              } else {
                console.log("Balance invoice already exists for this lead, skipping...");
              }
            }
          }
        }
      } catch (invoiceGenError) {
        console.error("Error generating final invoice:", invoiceGenError);
        // Don't fail the main request if invoice generation fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        tracking: trackingRecord,
        serverTimestamp,
        addressResolved,
        distanceWarning,
        permissions: {
          canEdit,
          canTrigger,
          role,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in track-job-status:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
