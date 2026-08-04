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
  turnstile_token?: string;
  website?: string; // Honeypot field; must stay empty.
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
function sanitizeInput(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 500);
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhone(phone: string): boolean {
  const phoneRegex = /^[\d\s+()-]{7,20}$/;
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
    const declaredLength = Number(req.headers.get("content-length") || 0);
    if (declaredLength > 32_768) {
      return new Response(
        JSON.stringify({ error: "Request body is too large" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
    const rateLimitSalt = Deno.env.get("LEAD_CAPTURE_RATE_LIMIT_SALT");
    if (!supabaseUrl || !serviceRoleKey || !turnstileSecret || !rateLimitSalt) {
      return new Response(
        JSON.stringify({ error: "Lead capture is not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const parsedBody: unknown = await req.json();
    if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const formData = parsedBody as LeadFormData;
    if (formData.website) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!formData.turnstile_token) {
      return new Response(
        JSON.stringify({ error: "Bot verification is required", field: "turnstile_token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const forwardedFor = req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
    const clientIp = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || forwardedFor || "unknown";
    const ipDigest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${rateLimitSalt}:${clientIp}`),
    );
    const requestKeyHash = Array.from(new Uint8Array(ipDigest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const { data: rateAllowed, error: rateError } = await supabase.rpc("check_lead_capture_rate_limit", {
      request_key_hash: requestKeyHash,
      maximum_requests: 5,
      window_seconds: 3600,
    });
    if (rateError) throw new Error("Failed to validate request rate");
    if (!rateAllowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "3600" } },
      );
    }

    const turnstileResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: turnstileSecret,
        response: formData.turnstile_token,
        remoteip: clientIp,
      }),
    });
    const turnstileResult = await turnstileResponse.json();
    if (!turnstileResponse.ok || turnstileResult.success !== true) {
      return new Response(
        JSON.stringify({ error: "Bot verification failed", field: "turnstile_token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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

    if (!validateServiceType(formData.service_type) || !validateFrequency(formData.frequency)) {
      return new Response(
        JSON.stringify({ error: "Invalid service selection", field: "service_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (
      formData.preferred_date
      && !/^\d{4}-\d{2}-\d{2}$/.test(formData.preferred_date)
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid preferred date", field: "preferred_date" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const invalidRoomCount = [formData.bedrooms, formData.bathrooms]
      .some((value) => value != null && (!Number.isFinite(value) || value < 0 || value > 100));
    const invalidSquareFeet = formData.square_feet != null
      && (!Number.isFinite(formData.square_feet) || formData.square_feet < 0 || formData.square_feet > 1_000_000);
    if (invalidRoomCount || invalidSquareFeet || (formData.has_pets != null && typeof formData.has_pets !== "boolean")) {
      return new Response(
        JSON.stringify({ error: "Invalid property measurements", field: "property" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const notes = [
      formData.message ? `Message: ${sanitizeInput(formData.message)}` : null,
      formData.referral_code ? `Referral Code: ${sanitizeInput(formData.referral_code)}` : null,
    ].filter(Boolean).join("\n");

    const { data: captureResult, error: captureError } = await supabase.rpc("capture_website_lead", {
      form_data: {
        name,
        phone: phone || null,
        email: email || null,
        address: sanitizeInput(formData.address) || null,
        city: sanitizeInput(formData.city) || null,
        state: sanitizeInput(formData.state) || null,
        zip_code: sanitizeInput(formData.zip_code) || null,
        service_type: sanitizeInput(formData.service_type) || null,
        frequency: sanitizeInput(formData.frequency) || null,
        preferred_date: sanitizeInput(formData.preferred_date) || null,
        preferred_time: sanitizeInput(formData.preferred_time) || null,
        bedrooms: formData.bedrooms ?? null,
        bathrooms: formData.bathrooms ?? null,
        square_feet: formData.square_feet ?? null,
        property_type: sanitizeInput(formData.property_type) || null,
        has_pets: formData.has_pets ?? null,
        notes: notes || null,
      },
    });
    if (captureError || !captureResult) throw new Error("Failed to capture lead");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Thank you! We'll be in touch soon.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in website-lead-capture:", error);
    return new Response(
      JSON.stringify({ error: "Unable to process the lead request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
