import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LeadAddress {
  id: string;
  lead_id: string;
  name: string | null;
  address: string;
  street: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadInteraction {
  id: string;
  lead_id: string;
  interaction_type: string;
  description: string | null;
  interaction_date: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  customer_id: string;
  estimate_number: string;
  title: string;
  description: string | null;
  status: string;
  subtotal: number | null;
  tax_rate: number | null;
  tax_amount: number | null;
  total: number | null;
  valid_until: string | null;
  notes: string | null;
  email: string | null;
  phone: string | null;
  phone2: string | null;
  origin: string | null;
  has_job: boolean | null;
  address: string | null;
  created_at: string;
  updated_at: string;
  // Preference fields
  preferred_days: string[] | null;
  preferred_time: string | null;
  frequency: string | null;
  service_type: string | null;
  service_areas: string[] | null;
  referral_customer_id: string | null;
  referral_name: string | null;
  visit_date: string | null;
  estimate_approved: boolean | null;
  estimate_approved_at: string | null;
  invoice_paid: boolean | null;
  invoice_paid_at: string | null;
  agreed_amount: number | null;
  // New property fields
  property_type: string | null;
  residence_type: string | null;
  square_feet: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  has_pets: boolean | null;
  add_on_services: string[] | null;
  business_name: string | null;
  tags: string[] | null;
  additional_notes: string | null;
  special_instructions: string | null;
  // Relations
  customer?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  lead_addresses?: LeadAddress[];
  lead_interactions?: LeadInteraction[];
}

export interface LeadFormData {
  customer_id: string;
  estimate_number: string;
  title: string;
  description?: string;
  status?: string;
  subtotal?: number;
  tax_rate?: number;
  tax_amount?: number;
  total?: number;
  valid_until?: string;
  notes?: string;
  email?: string;
  phone?: string;
  phone2?: string;
  origin?: string;
  has_job?: boolean;
  address?: string;
  // Preference fields
  preferred_days?: string[];
  preferred_time?: string;
  frequency?: string;
  service_type?: string;
  service_areas?: string[];
  referral_customer_id?: string;
  referral_name?: string;
  visit_date?: string;
  estimate_approved?: boolean;
  estimate_approved_at?: string;
  invoice_paid?: boolean;
  invoice_paid_at?: string;
  agreed_amount?: number;
  // New property fields
  property_type?: string;
  residence_type?: string;
  square_feet?: number;
  bedrooms?: number;
  bathrooms?: number;
  has_pets?: boolean;
  add_on_services?: string[];
  business_name?: string;
  tags?: string[];
  additional_notes?: string;
  special_instructions?: string;
}

export function useLeads() {
  return useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select(`
          *,
          customer:customers!estimates_customer_id_fkey(id, name, email, phone, address),
          lead_addresses(*),
          lead_interactions(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as Lead[];
    },
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: LeadFormData) => {
      const { data, error } = await supabase
        .from("leads")
        .insert({
          customer_id: formData.customer_id,
          estimate_number: formData.estimate_number,
          title: formData.title,
          description: formData.description || null,
          status: formData.status || "new_lead",
          subtotal: formData.subtotal || 0,
          tax_rate: formData.tax_rate || 0,
          tax_amount: formData.tax_amount || 0,
          total: formData.total || 0,
          valid_until: formData.valid_until || null,
          notes: formData.notes || null,
          email: formData.email || null,
          phone: formData.phone || null,
          phone2: formData.phone2 || null,
          origin: formData.origin || null,
          has_job: formData.has_job || false,
          address: formData.address || null,
          preferred_days: formData.preferred_days || [],
          preferred_time: formData.preferred_time || null,
          frequency: formData.frequency || null,
          service_type: formData.service_type || null,
          service_areas: formData.service_areas || [],
          referral_customer_id: formData.referral_customer_id || null,
          referral_name: formData.referral_name || null,
          visit_date: formData.visit_date || null,
          estimate_approved: formData.estimate_approved || false,
          agreed_amount: formData.agreed_amount || 0,
          // New property fields
          property_type: formData.property_type || null,
          residence_type: formData.residence_type || null,
          square_feet: formData.square_feet || null,
          bedrooms: formData.bedrooms || null,
          bathrooms: formData.bathrooms || null,
          has_pets: formData.has_pets || false,
          add_on_services: formData.add_on_services || [],
          business_name: formData.business_name || null,
          tags: formData.tags || [],
          additional_notes: formData.additional_notes || null,
          special_instructions: formData.special_instructions || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead criado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating lead:", error);
      toast.error("Erro ao criar lead");
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...formData }: Partial<LeadFormData> & { id: string }) => {
      const updateData: Record<string, unknown> = {};
      
      if (formData.customer_id !== undefined) updateData.customer_id = formData.customer_id;
      if (formData.estimate_number !== undefined) updateData.estimate_number = formData.estimate_number;
      if (formData.title !== undefined) updateData.title = formData.title;
      if (formData.description !== undefined) updateData.description = formData.description;
      if (formData.status !== undefined) updateData.status = formData.status;
      if (formData.subtotal !== undefined) updateData.subtotal = formData.subtotal;
      if (formData.tax_rate !== undefined) updateData.tax_rate = formData.tax_rate;
      if (formData.tax_amount !== undefined) updateData.tax_amount = formData.tax_amount;
      if (formData.total !== undefined) updateData.total = formData.total;
      if (formData.valid_until !== undefined) updateData.valid_until = formData.valid_until;
      if (formData.notes !== undefined) updateData.notes = formData.notes;
      if (formData.email !== undefined) updateData.email = formData.email;
      if (formData.phone !== undefined) updateData.phone = formData.phone;
      if (formData.phone2 !== undefined) updateData.phone2 = formData.phone2;
      if (formData.origin !== undefined) updateData.origin = formData.origin;
      if (formData.has_job !== undefined) updateData.has_job = formData.has_job;
      if (formData.address !== undefined) updateData.address = formData.address;
      // New fields
      if (formData.preferred_days !== undefined) updateData.preferred_days = formData.preferred_days;
      if (formData.preferred_time !== undefined) updateData.preferred_time = formData.preferred_time;
      if (formData.frequency !== undefined) updateData.frequency = formData.frequency;
      if (formData.service_type !== undefined) updateData.service_type = formData.service_type;
      if (formData.service_areas !== undefined) updateData.service_areas = formData.service_areas;
      if (formData.referral_customer_id !== undefined) updateData.referral_customer_id = formData.referral_customer_id;
      if (formData.referral_name !== undefined) updateData.referral_name = formData.referral_name;
      if (formData.visit_date !== undefined) updateData.visit_date = formData.visit_date;
      if (formData.estimate_approved !== undefined) updateData.estimate_approved = formData.estimate_approved;
      if (formData.estimate_approved_at !== undefined) updateData.estimate_approved_at = formData.estimate_approved_at;
      if (formData.invoice_paid !== undefined) updateData.invoice_paid = formData.invoice_paid;
      if (formData.invoice_paid_at !== undefined) updateData.invoice_paid_at = formData.invoice_paid_at;
      if (formData.agreed_amount !== undefined) updateData.agreed_amount = formData.agreed_amount;
      // New property fields
      if (formData.property_type !== undefined) updateData.property_type = formData.property_type;
      if (formData.residence_type !== undefined) updateData.residence_type = formData.residence_type;
      if (formData.square_feet !== undefined) updateData.square_feet = formData.square_feet;
      if (formData.bedrooms !== undefined) updateData.bedrooms = formData.bedrooms;
      if (formData.bathrooms !== undefined) updateData.bathrooms = formData.bathrooms;
      if (formData.has_pets !== undefined) updateData.has_pets = formData.has_pets;
      if (formData.add_on_services !== undefined) updateData.add_on_services = formData.add_on_services;
      if (formData.business_name !== undefined) updateData.business_name = formData.business_name;
      if (formData.tags !== undefined) updateData.tags = formData.tags;
      if (formData.additional_notes !== undefined) updateData.additional_notes = formData.additional_notes;
      if (formData.special_instructions !== undefined) updateData.special_instructions = formData.special_instructions;

      const { data, error } = await supabase
        .from("leads")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead atualizado!");
    },
    onError: (error) => {
      console.error("Error updating lead:", error);
      toast.error("Erro ao atualizar lead");
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead excluído!");
    },
    onError: (error) => {
      console.error("Error deleting lead:", error);
      toast.error("Erro ao excluir lead");
    },
  });
}

// Lead Addresses hooks
export function useCreateLeadAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { lead_id: string; address: string; street?: string; city?: string; state?: string; postal_code?: string; notes?: string }) => {
      const { data: result, error } = await supabase
        .from("lead_addresses")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useDeleteLeadAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lead_addresses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

// Lead Interactions hooks
export function useCreateLeadInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { lead_id: string; interaction_type: string; description?: string; interaction_date?: string; created_by?: string }) => {
      const { data: result, error } = await supabase
        .from("lead_interactions")
        .insert({
          ...data,
          interaction_date: data.interaction_date || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Interação adicionada!");
    },
  });
}

export function useDeleteLeadInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lead_interactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

// Helper to generate lead number
export async function generateLeadNumber(): Promise<string> {
  const { data, error } = await supabase
    .from("leads")
    .select("estimate_number")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error fetching last lead:", error);
    return `LEAD-${String(1).padStart(3, "0")}`;
  }

  if (!data || data.length === 0) {
    return "LEAD-001";
  }

  const lastNumber = data[0].estimate_number;
  const match = lastNumber.match(/(?:EST|LEAD)-(\d+)/);
  if (match) {
    const nextNumber = parseInt(match[1], 10) + 1;
    return `LEAD-${String(nextNumber).padStart(3, "0")}`;
  }

  return `LEAD-${String(1).padStart(3, "0")}`;
}

// Lead status pipeline
export const LEAD_STATUSES = [
  { value: "new_lead", label: "New Lead", color: "bg-blue-500" },
  { value: "qualification", label: "Qualification", color: "bg-purple-500" },
  { value: "visit_scheduled", label: "Visit Scheduled", color: "bg-cyan-500" },
  { value: "estimate_completed", label: "Estimate Completed", color: "bg-amber-500" },
  { value: "negotiation", label: "Negotiation", color: "bg-orange-500" },
  { value: "active_customer", label: "Active Customer", color: "bg-green-500" },
  { value: "cold_followup", label: "Cold Follow-Up", color: "bg-slate-400" },
  { value: "warm_followup", label: "Warm Follow-Up", color: "bg-yellow-500" },
  { value: "reactivation", label: "Reactivation", color: "bg-indigo-500" },
  { value: "disqualified", label: "Disqualified / Lost", color: "bg-red-500" },
] as const;

export const LEAD_ORIGINS = [
  "Google Ads",
  "Google Local Services",
  "Website",
  "Phone",
  "Email",
  "SMS",
  "Referral",
] as const;

export const INTERACTION_TYPES = [
  { value: "call", label: "Phone Call" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
  { value: "visit", label: "Visit" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "other", label: "Other" },
] as const;
