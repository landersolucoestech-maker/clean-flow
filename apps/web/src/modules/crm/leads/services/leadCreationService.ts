import { supabase } from "@/integrations/supabase/client";
import { generateLeadNumber } from "@/hooks/useLeads";
import { SERVICE_TYPE_OPTIONS } from "@/lib/serviceEnums";
import type { LeadAddressEntry, LeadInteractionEntry } from "../types/leadForm";

export interface CreateLeadFormData {
  primaryContactName: string;
  businessName: string;
  email: string;
  phone: string;
  tags: string[];
  leadSource: string;
  referralType: "existing" | "manual";
  referralCustomerId: string;
  referralName: string;
  stage: string;
  serviceType: string;
  propertyType: string;
  residenceType: string;
  squareFeet: string;
  bedrooms: string;
  bathrooms: string;
  frequency: string;
  hasPets: boolean;
  serviceAreas: string[];
  addOnServices: string[];
  preferredDays: string[];
  preferredTime: string;
  visitDate: string;
  agreedAmount: string;
  validUntil: string;
  notes: string;
  additionalNotes: string;
  specialInstructions: string;
}

function parseMoney(value: string): number {
  const parsed = Number.parseFloat(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatLeadAddress(address?: LeadAddressEntry): string {
  if (!address) return "";
  return `${address.address}${address.city ? `, ${address.city}` : ""}${address.state ? `, ${address.state}` : ""} ${address.postalCode || ""}`.trim();
}

async function resolveOrCreateLeadCustomer(
  formData: CreateLeadFormData,
  primaryAddress: LeadAddressEntry | undefined,
): Promise<string> {
  const customerName = formData.primaryContactName.trim();
  const email = formData.email.trim() || null;
  const phone = formData.phone.trim() || null;
  const origin = formData.leadSource || null;

  if (email) {
    const { data, error } = await supabase.from("customers").select("id").eq("email", email).limit(1);
    if (error) throw error;
    if (data?.[0]?.id) return data[0].id;
  }

  const { data: nameMatches, error: nameError } = await supabase
    .from("customers")
    .select("id")
    .ilike("name", customerName)
    .limit(1);
  if (nameError) throw nameError;
  if (nameMatches?.[0]?.id) return nameMatches[0].id;

  const { data: newCustomer, error: createCustomerError } = await supabase
    .from("customers")
    .insert({
      name: customerName,
      email,
      phone,
      address: formatLeadAddress(primaryAddress) || null,
      city: primaryAddress?.city || null,
      state: primaryAddress?.state || null,
      zip_code: primaryAddress?.postalCode || null,
      source: origin,
      status: "lead",
      additional_info: formData.businessName ? `Business: ${formData.businessName}` : null,
    })
    .select("id")
    .single();

  if (createCustomerError) throw createCustomerError;
  return newCustomer.id;
}

export async function createLeadWithRelations(
  formData: CreateLeadFormData,
  addresses: LeadAddressEntry[],
  interactions: LeadInteractionEntry[],
): Promise<void> {
  const nonEmptyAddresses = addresses.filter((address) => address.address.trim());
  const primaryAddress = nonEmptyAddresses[0];
  const customerId = await resolveOrCreateLeadCustomer(formData, primaryAddress);
  const leadNumber = await generateLeadNumber();
  const total = parseMoney(formData.agreedAmount);
  const title = formData.serviceType
    ? SERVICE_TYPE_OPTIONS.find((service) => service.value === formData.serviceType)?.label || "New Lead"
    : "New Lead";
  const email = formData.email.trim() || null;
  const phone = formData.phone.trim() || null;
  const origin = formData.leadSource || null;

  const { data: leadData, error: leadError } = await supabase
    .from("leads")
    .insert({
      customer_id: customerId,
      estimate_number: leadNumber,
      title,
      description: formData.businessName || null,
      status: formData.stage,
      subtotal: total,
      tax_rate: 0,
      tax_amount: 0,
      total,
      valid_until: formData.validUntil || null,
      notes: formData.notes || null,
      email,
      phone,
      origin,
      has_job: false,
      address: formatLeadAddress(primaryAddress) || null,
      preferred_days: formData.preferredDays.length > 0 ? formData.preferredDays : null,
      preferred_time: formData.preferredTime || null,
      frequency: formData.frequency || null,
      service_type: formData.serviceType || null,
      service_areas: formData.serviceAreas.length > 0 ? formData.serviceAreas : null,
      referral_customer_id: formData.leadSource === "referral" && formData.referralType === "existing"
        ? formData.referralCustomerId || null
        : null,
      referral_name: formData.leadSource === "referral" && formData.referralType === "manual"
        ? formData.referralName || null
        : null,
      visit_date: formData.visitDate || null,
      agreed_amount: total,
      property_type: formData.propertyType || null,
      residence_type: formData.residenceType || null,
      square_feet: formData.squareFeet ? Number.parseInt(formData.squareFeet, 10) : null,
      bedrooms: formData.bedrooms ? Number.parseInt(formData.bedrooms, 10) : null,
      bathrooms: formData.bathrooms ? Number.parseFloat(formData.bathrooms) : null,
      has_pets: formData.hasPets,
      add_on_services: formData.addOnServices.length > 0 ? formData.addOnServices : null,
      business_name: formData.businessName || null,
      tags: formData.tags.length > 0 ? formData.tags : null,
      additional_notes: formData.additionalNotes || null,
      special_instructions: formData.specialInstructions || null,
    })
    .select()
    .single();
  if (leadError) throw leadError;

  if (nonEmptyAddresses.length > 0) {
    const { error } = await supabase.from("lead_addresses").insert(
      nonEmptyAddresses.map((address) => ({
        lead_id: leadData.id,
        name: address.name || "Home",
        address: formatLeadAddress(address),
        street: address.address || null,
        city: address.city || null,
        state: address.state || null,
        postal_code: address.postalCode || null,
        notes: address.notes || null,
      })),
    );
    if (error) throw error;
  }

  if (interactions.length > 0) {
    const { error } = await supabase.from("lead_interactions").insert(
      interactions.map((interaction) => ({
        lead_id: leadData.id,
        interaction_type: interaction.type,
        description: interaction.description || null,
        interaction_date: `${interaction.date}T${interaction.time}:00`,
        created_by: null,
      })),
    );
    if (error) throw error;
  }
}
