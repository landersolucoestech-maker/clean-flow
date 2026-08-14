import { supabase } from "@/integrations/supabase/client";

export async function fetchLeadInvoices() {
  const { data, error } = await supabase
    .from("invoices")
    .select("id, lead_id, status, notes, total, invoice_type, amount_paid")
    .not("lead_id", "is", null);
  if (error) throw error;
  return data || [];
}

export async function fetchJobsForLeadIds(leadIds: string[]) {
  if (leadIds.length === 0) return [];
  const { data, error } = await supabase
    .from("jobs")
    .select("id, lead_id")
    .in("lead_id", leadIds);
  if (error) throw error;
  return data || [];
}
