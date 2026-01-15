import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface LeadFormData {
  // Required fields
  name: string;
  phone?: string;
  email?: string;
  
  // Property info
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  
  // Service preferences
  service_type?: string;
  frequency?: string;
  preferred_date?: string;
  preferred_time?: string;
  
  // Property details
  bedrooms?: number;
  bathrooms?: number;
  square_feet?: number;
  property_type?: string;
  has_pets?: boolean;
  
  // Additional
  message?: string;
  source?: string;
  referral_code?: string;
}

// Centralized service type and frequency enums (must match frontend)
const SERVICE_TYPES = [
  "Regular Cleaning",
  "Deep Cleaning",
  "First Cleaning",
  "One-Time Cleaning",
  "Move-In / Move-Out Cleaning",
  "Office Cleaning",
  "Commercial Cleaning",
  "Post-Construction Cleaning",
  "Cleaning for a Reason",
] as const;

const FREQUENCY_OPTIONS = [
  "Daily",
  "Weekly",
  "Regular Cleaning 2 Weeks",
  "Regular Cleaning 3 Weeks",
  "Regular Cleaning 4 Weeks",
  "One-Time",
] as const;

// Validate and sanitize input
function sanitizeInput(value: string | undefined): string {
  if (!value) return "";
  return value.trim().slice(0, 500);
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]{7,20}$/;
  return phoneRegex.test(phone);
}

function validateServiceType(value: string | undefined): boolean {
  if (!value) return true; // Optional field
  return SERVICE_TYPES.includes(value as typeof SERVICE_TYPES[number]);
}

function validateFrequency(value: string | undefined): boolean {
  if (!value) return true; // Optional field
  return FREQUENCY_OPTIONS.includes(value as typeof FREQUENCY_OPTIONS[number]);
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const formData: LeadFormData = await req.json();

    // Validate required fields
    const name = sanitizeInput(formData.name);
    if (!name || name.length < 2) {
      return new Response(
        JSON.stringify({ error: "Valid name is required", field: "name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // At least phone or email required
    const phone = sanitizeInput(formData.phone);
    const email = sanitizeInput(formData.email);

    if (!phone && !email) {
      return new Response(
        JSON.stringify({ error: "Phone or email is required", field: "contact" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (email && !validateEmail(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format", field: "email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (phone && !validatePhone(phone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone format", field: "phone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing customer by phone or email
    let customerId: string | null = null;
    
    if (phone) {
      const { data: existingByPhone } = await supabase
        .from("customers")
        .select("id")
        .or(`phone.eq.${phone},phone2.eq.${phone}`)
        .limit(1)
        .single();
      
      if (existingByPhone) {
        customerId = existingByPhone.id;
      }
    }

    if (!customerId && email) {
      const { data: existingByEmail } = await supabase
        .from("customers")
        .select("id")
        .eq("email", email)
        .limit(1)
        .single();
      
      if (existingByEmail) {
        customerId = existingByEmail.id;
      }
    }

    // Create customer if not exists
    if (!customerId) {
      const { data: newCustomer, error: customerError } = await supabase
        .from("customers")
        .insert({
          name,
          phone: phone || null,
          email: email || null,
          address: sanitizeInput(formData.address) || null,
          city: sanitizeInput(formData.city) || null,
          state: sanitizeInput(formData.state) || null,
          zip_code: sanitizeInput(formData.zip_code) || null,
          source: formData.source || "website_form",
          status: "lead",
        })
        .select("id")
        .single();

      if (customerError) {
        console.error("Error creating customer:", customerError);
        throw new Error("Failed to create customer record");
      }

      customerId = newCustomer.id;
    }

    // Generate estimate number
    const { data: lastEstimate } = await supabase
      .from("leads")
      .select("estimate_number")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1001;
    if (lastEstimate?.estimate_number) {
      const match = lastEstimate.estimate_number.match(/EST-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    const estimateNumber = `EST-${nextNumber}`;

    // Build notes from message and additional info
    const notes = [
      formData.message ? `Message: ${sanitizeInput(formData.message)}` : null,
      formData.referral_code ? `Referral Code: ${sanitizeInput(formData.referral_code)}` : null,
    ].filter(Boolean).join("\n");

    // Create lead/estimate
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        customer_id: customerId,
        title: `${formData.service_type || "Cleaning"} - ${name}`,
        estimate_number: estimateNumber,
        status: "new",
        origin: formData.source || "website_form",
        address: sanitizeInput(formData.address) || null,
        service_type: sanitizeInput(formData.service_type) || null,
        frequency: sanitizeInput(formData.frequency) || null,
        preferred_time: sanitizeInput(formData.preferred_time) || null,
        preferred_days: formData.preferred_date ? [formData.preferred_date] : null,
        bedrooms: formData.bedrooms || null,
        bathrooms: formData.bathrooms || null,
        square_feet: formData.square_feet || null,
        property_type: sanitizeInput(formData.property_type) || null,
        has_pets: formData.has_pets ?? null,
        notes: notes || null,
        phone: phone || null,
        email: email || null,
      })
      .select()
      .single();

    if (leadError) {
      console.error("Error creating lead:", leadError);
      throw new Error("Failed to create lead record");
    }

    // Log the lead interaction
    await supabase.from("lead_interactions").insert({
      lead_id: lead.id,
      interaction_type: "form_submission",
      description: `Lead captured from ${formData.source || "website form"}`,
    });

    console.log("Lead captured successfully:", {
      lead_id: lead.id,
      customer_id: customerId,
      estimate_number: estimateNumber,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Thank you! We'll be in touch soon.",
        lead_id: lead.id,
        estimate_number: estimateNumber,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in website-lead-capture:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
