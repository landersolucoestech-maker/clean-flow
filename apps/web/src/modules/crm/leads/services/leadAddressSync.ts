import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

export interface LeadAddressInput {
  id?: string;
  addressName: string;
  address: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  notes: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatFullAddress(street: string, city?: string, state?: string, postalCode?: string) {
  const cleanStreet = street.trim();
  const cleanCity = (city || "").trim();
  const cleanState = (state || "").trim();
  const cleanPostalCode = (postalCode || "").trim();
  return `${cleanStreet}${cleanCity ? `, ${cleanCity}` : ""}${cleanState ? `, ${cleanState}` : ""} ${cleanPostalCode}`.trim();
}

function toAddressRows(leadId: string, addresses: LeadAddressInput[]) {
  return addresses
    .map((address) => {
      const street = (address.street || address.address || "").trim();
      if (!street) return null;
      const row: TablesInsert<"lead_addresses"> & { id?: string } = {
        lead_id: leadId,
        name: address.addressName.trim() || "Home",
        address: formatFullAddress(street, address.city, address.state, address.postalCode),
        street,
        city: address.city?.trim() || null,
        state: address.state?.trim() || null,
        postal_code: address.postalCode?.trim() || null,
        notes: address.notes.trim() || null,
      };
      if (address.id && UUID_PATTERN.test(address.id)) row.id = address.id;
      return row;
    })
    .filter((row): row is TablesInsert<"lead_addresses"> & { id?: string } => row !== null);
}

export async function syncLeadAddresses(leadId: string, addresses: LeadAddressInput[]) {
  const rows = toAddressRows(leadId, addresses);
  const { data: existing, error: existingError } = await supabase.from("lead_addresses").select("id").eq("lead_id", leadId);
  if (existingError) throw existingError;

  const keepIds = rows.flatMap((row) => (row.id ? [row.id] : []));
  const removedIds = (existing || []).map((row) => row.id).filter((id) => !keepIds.includes(id));
  if (removedIds.length > 0) {
    const { error } = await supabase.from("lead_addresses").delete().in("id", removedIds);
    if (error) throw error;
  }

  const existingRows = rows.filter((row) => row.id);
  const newRows = rows.filter((row) => !row.id);
  if (existingRows.length > 0) {
    const { error } = await supabase.from("lead_addresses").upsert(existingRows, { onConflict: "id" });
    if (error) throw error;
  }
  if (newRows.length > 0) {
    const { error } = await supabase.from("lead_addresses").insert(newRows);
    if (error) throw error;
  }
}
