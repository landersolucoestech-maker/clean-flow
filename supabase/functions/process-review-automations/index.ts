import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authorizeServiceRequest } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface JobWithCustomer {
  id: string;
  customer_id: string;
  time_finished: string;
  title: string;
  customers: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
}

interface CompanySettings {
  id: string;
  trade_name: string;
  legal_name: string;
  google_review_url: string | null;
  nextdoor_review_url: string | null;
  review_delay_minutes: number | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authError = authorizeServiceRequest(req);
    if (authError) return authError;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get company settings for review delay and URLs
    const { data: companySettings, error: settingsError } = await supabase
      .from("company_settings")
      .select("id, trade_name, legal_name, google_review_url, nextdoor_review_url, review_delay_minutes")
      .limit(1)
      .single();

    if (settingsError || !companySettings) {
      console.error("Error fetching company settings:", settingsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch company settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const settings = companySettings as CompanySettings;
    const delayMinutes = settings.review_delay_minutes ?? 120; // Default 2 hours
    const companyName = settings.trade_name || settings.legal_name || "Our Company";

    // Calculate the cutoff time based on updated_at (when status was changed to completed)
    const cutoffTime = new Date(Date.now() - delayMinutes * 60 * 1000).toISOString();
    
    // Also set a maximum age (don't send review requests for jobs older than 7 days)
    const maxAgeTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    console.log(`Looking for completed jobs with updated_at between ${maxAgeTime} and ${cutoffTime}`);
    console.log(`Delay minutes: ${delayMinutes}`);

    // Find completed jobs that:
    // 1. Have status = 'completed'
    // 2. Have time_finished set (indicates the job was actually finished)
    // 3. updated_at is between maxAgeTime and cutoffTime (job was completed X minutes ago)
    // 4. Don't already have a review request log entry
    const { data: eligibleJobs, error: jobsError } = await supabase
      .from("jobs")
      .select(`
        id,
        customer_id,
        time_finished,
        title,
        updated_at,
        scheduled_date,
        customers!inner (
          id,
          name,
          phone
        )
      `)
      .eq("status", "completed")
      .not("time_finished", "is", null)
      .lt("updated_at", cutoffTime)
      .gt("updated_at", maxAgeTime)
      .not("customers.phone", "is", null)
      .order("updated_at", { ascending: true })
      .limit(50); // Process in batches

    if (jobsError) {
      console.error("Error fetching jobs:", jobsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch jobs", details: jobsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!eligibleJobs || eligibleJobs.length === 0) {
      console.log("No eligible jobs found");
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No eligible jobs found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${eligibleJobs.length} potentially eligible jobs`);

    // Get existing review request logs to filter out already processed jobs
    const jobIds = eligibleJobs.map((j) => j.id);
    const { data: existingLogs } = await supabase
      .from("review_request_logs")
      .select("job_id")
      .in("job_id", jobIds);

    const processedJobIds = new Set((existingLogs || []).map((l: { job_id: string }) => l.job_id));
    const jobsToProcess = eligibleJobs.filter((j) => !processedJobIds.has(j.id));

    console.log(`${jobsToProcess.length} jobs need review requests (${processedJobIds.size} already processed)`);

    let successCount = 0;
    let failedCount = 0;

    for (const job of jobsToProcess) {
      try {
        // Handle the case where customers might be an array or single object
        const customerData = job.customers;
        const customer = Array.isArray(customerData) ? customerData[0] : customerData;
        
        if (!customer || !customer.phone) {
          console.log(`Skipping job ${job.id}: No customer phone`);
          continue;
        }

        // Build the review message
        const reviewLinks: string[] = [];
        if (settings.google_review_url) {
          reviewLinks.push(`🌟Google Review: ${settings.google_review_url}`);
        }
        if (settings.nextdoor_review_url) {
          reviewLinks.push(`🌟Nextdoor Review: ${settings.nextdoor_review_url}`);
        }
        const reviewLinksText = reviewLinks.length > 0 
          ? reviewLinks.join("\n\n") 
          : "It really helps our small business. Thank you!";

        const message = `Hi ${customer.name}! Thank you for choosing ${companyName}. We'd love to hear your feedback! Could you take a moment to leave us a review?\n\n${reviewLinksText}\n\n- ${companyName}`;

        // Get or create conversation
        let conversationId: string;
        const { data: existingConversation } = await supabase
          .from("conversations")
          .select("id")
          .eq("customer_id", customer.id)
          .maybeSingle();

        if (existingConversation) {
          conversationId = existingConversation.id;
        } else {
          const { data: newConversation, error: convError } = await supabase
            .from("conversations")
            .insert({ customer_id: customer.id })
            .select()
            .single();

          if (convError) {
            console.error(`Failed to create conversation for customer ${customer.id}:`, convError);
            failedCount++;
            continue;
          }
          conversationId = newConversation.id;
        }

        // Save message to database
        const { error: msgError } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            content: message,
            sender_type: "user",
            read: true,
          });

        if (msgError) {
          console.error(`Failed to save message for job ${job.id}:`, msgError);
          failedCount++;
          continue;
        }

        // Update conversation last message
        await supabase
          .from("conversations")
          .update({
            last_message: message.length > 100 ? message.slice(0, 100) + "..." : message,
            last_message_at: new Date().toISOString(),
            unread: false,
          })
          .eq("id", conversationId);

        // Send SMS via RingCentral
        let smsSent = false;
        try {
          const response = await supabase.functions.invoke("ringcentral-send-message", {
            body: {
              company_id: settings.id,
              to_phone: customer.phone,
              message: message,
            },
          });

          if (!response.error) {
            smsSent = true;
            console.log(`SMS sent for job ${job.id}`);
          } else {
            console.error(`RingCentral error for job ${job.id}:`, response.error);
          }
        } catch (rcError) {
          console.error(`Failed to send SMS for job ${job.id}:`, rcError);
        }

        // Log the review request (even if SMS failed, we don't want to spam)
        const { error: logError } = await supabase
          .from("review_request_logs")
          .insert({
            job_id: job.id,
            customer_id: customer.id,
            message: message,
            sms_sent: smsSent,
          });

        if (logError) {
          console.error(`Failed to log review request for job ${job.id}:`, logError);
          // Don't increment failed count here, the review was sent
        }

        successCount++;
        console.log(`Review request sent for job ${job.id}`);

      } catch (jobError) {
        console.error(`Error processing job ${job.id}:`, jobError);
        failedCount++;
      }
    }

    const result = {
      success: true,
      processed: successCount,
      failed: failedCount,
      skipped: eligibleJobs.length - jobsToProcess.length,
      delayMinutes,
    };

    console.log("Processing complete:", result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
