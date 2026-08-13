import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { FREQUENCY_OPTIONS, normalizeFrequency as normalizeFrequencyFromEnums } from "@/lib/serviceEnums";

type CustomerRow = Tables<"customers">;
type CustomerAddressRow = Tables<"customer_addresses">;
type JobCustomerReference = Pick<Tables<"jobs">, "id" | "customer_id">;

export interface CustomerAddress {
  id?: string;
  customer_id?: string;
  name: string;
  street: string;
  complement: string;
  city: string;
  state: string;
  postal_code: string;
  notes: string;
  additional_notes: string;
  frequency: string;
  preferred_day: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  phone2: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  status: string | null;
  frequency: string | null;
  preferred_day: string | null;
  payment_method: string | null;
  customer_since: string | null;
  last_service: string | null;
  total_jobs: number | null;
  revenue: number | null;
  rating: number | null;
  notes: string | null;
  additional_info: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  addresses?: CustomerAddress[];
  billing_contact_name: string | null;
  billing_contact_relationship: string | null;
  billing_contact_email: string | null;
  billing_contact_phone: string | null;
  billing_contact_phone2: string | null;
  billing_contact_notes: string | null;
}

export interface CustomerFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone1: string;
  phone2: string;
  status: string;
  paymentMethod: string;
  customerSince: Date;
  source: string;
  additionalInfo?: string;
  addresses: CustomerAddress[];
  billingContactName?: string;
  billingContactRelationship?: string;
  billingContactEmail?: string;
  billingContactPhone?: string;
  billingContactPhone2?: string;
  billingContactNotes?: string;
}

export interface ImportedCustomerRow {
  "First Name"?: string;
  "Last Name"?: string;
  "Name"?: string;
  "Email"?: string;
  "Phone 1"?: string;
  "Phone 2"?: string;
  "Status"?: string;
  "Payment Method"?: string;
  "Source"?: string;
  "Customer Since"?: string;
  "Last Service"?: string;
  "Total Jobs"?: number;
  "Revenue"?: number;
  "Rating"?: number;
  "Notes"?: string;
  [key: string]: string | number | undefined;
}

type RpcResult<T> = { data: T | null; error: unknown };

const normalizeFrequency = (value: unknown): string | null => {
  if (!value) return null;
  const raw = String(value).trim();
  const normalized = normalizeFrequencyFromEnums(raw);
  if (normalized) return normalized;
  if (FREQUENCY_OPTIONS.some((option) => option === raw)) return raw;

  const legacy: Record<string, string> = {
    "one-time": "One-Time",
    daily: "Daily",
    weekly: "Weekly",
    "every-2-weeks": "Regular Cleaning 2 Weeks",
    "every-3-weeks": "Regular Cleaning 3 Weeks",
    "every-4-weeks": "Regular Cleaning 4 Weeks",
    "every-other-day": "Daily",
    "One Time": "One-Time",
    "Every Other Day": "Daily",
    "Every 2 Weeks": "Regular Cleaning 2 Weeks",
    "Every 3 Weeks": "Regular Cleaning 3 Weeks",
    "Every 4 Weeks": "Regular Cleaning 4 Weeks",
    "Every 5 Weeks": "Once a Month",
    "Every 6 Weeks": "Once a Month",
    "Every 7 Weeks": "Once a Month",
    "Every 8 Weeks": "Once a Month",
    "First of Month": "Once a Month",
    "Second of Month": "Once a Month",
    "Third of Month": "Once a Month",
    "Fourth of Month": "Once a Month",
    "Last of Month": "Once a Month",
    "Bi-Weekly": "Regular Cleaning 2 Weeks",
    Biweekly: "Regular Cleaning 2 Weeks",
    "bi-weekly": "Regular Cleaning 2 Weeks",
  };
  return legacy[raw] || legacy[raw.toLowerCase()] || raw;
};

const normalizePreferredDay = (value: unknown): string | null => {
  if (!value) return null;
  const raw = String(value).trim().toLowerCase();
  return ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].includes(raw)
    ? raw
    : null;
};

const formatAddress = (address?: CustomerAddress): string | null => {
  if (!address) return null;
  const statePostal = [address.state, address.postal_code].filter(Boolean).join(" ");
  const formatted = [address.street, address.city, statePostal].filter(Boolean).join(", ").trim();
  return formatted || null;
};

const customerPayload = (formData: CustomerFormData) => ({
  name: `${formData.firstName} ${formData.lastName}`.trim(),
  email: formData.email || null,
  phone: formData.phone1 || null,
  phone2: formData.phone2 || null,
  address: formatAddress(formData.addresses[0]),
  status: formData.status === "active" ? "Active" : "Inactive",
  payment_method: formData.paymentMethod || null,
  customer_since: formData.customerSince.toISOString().split("T")[0],
  source: formData.source || null,
  additional_info: formData.additionalInfo || null,
  billing_contact_name: formData.billingContactName || null,
  billing_contact_relationship: formData.billingContactRelationship || null,
  billing_contact_email: formData.billingContactEmail || null,
  billing_contact_phone: formData.billingContactPhone || null,
  billing_contact_phone2: formData.billingContactPhone2 || null,
  billing_contact_notes: formData.billingContactNotes || null,
});

const addressesPayload = (addresses: CustomerAddress[]) => addresses.map((address) => ({
  name: address.name,
  street: address.street || null,
  complement: address.complement || null,
  city: address.city || null,
  state: address.state || null,
  postal_code: address.postal_code || null,
  notes: address.notes || null,
  additional_notes: address.additional_notes || null,
  frequency: normalizeFrequency(address.frequency) || "Weekly",
  preferred_day: normalizePreferredDay(address.preferred_day) || "monday",
}));

async function saveCustomer(targetCustomerId: string | null, formData: CustomerFormData): Promise<Customer> {
  const result = await supabase.rpc("save_customer_with_addresses" as never, {
    target_customer_id: targetCustomerId,
    customer_payload: customerPayload(formData),
    addresses_payload: addressesPayload(formData.addresses),
  } as never) as unknown as RpcResult<Customer>;
  if (result.error || !result.data) throw result.error || new Error("Customer save returned no data");
  return result.data;
}

async function fetchAll<T>(factory: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const result = await factory(from, from + pageSize - 1);
    if (result.error) throw result.error;
    if (!result.data?.length) break;
    rows.push(...result.data);
    if (result.data.length < pageSize) break;
  }
  return rows;
}

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const [customers, addresses, jobs] = await Promise.all([
        fetchAll<CustomerRow>(async (from, to) => {
          const { data, error } = await supabase.from("customers").select("*").order("name").order("id").range(from, to);
          return { data, error };
        }),
        fetchAll<CustomerAddressRow>(async (from, to) => {
          const { data, error } = await supabase.from("customer_addresses").select("*").order("customer_id").order("id").range(from, to);
          return { data, error };
        }),
        fetchAll<JobCustomerReference>(async (from, to) => {
          const { data, error } = await supabase.from("jobs").select("id, customer_id").order("customer_id").range(from, to);
          return { data, error };
        }),
      ]);

      const counts = new Map<string, number>();
      for (const job of jobs) {
        if (job.customer_id) counts.set(job.customer_id, (counts.get(job.customer_id) || 0) + 1);
      }

      const byCustomer = new Map<string, CustomerAddress[]>();
      for (const address of addresses) {
        const normalized = {
          ...address,
          street: address.street || "",
          complement: address.complement || "",
          city: address.city || "",
          state: address.state || "",
          postal_code: address.postal_code || "",
          notes: address.notes || "",
          additional_notes: address.additional_notes || "",
          frequency: normalizeFrequency(address.frequency) || address.frequency,
          preferred_day: normalizePreferredDay(address.preferred_day) || address.preferred_day,
        } as CustomerAddress;
        const list = byCustomer.get(address.customer_id) || [];
        list.push(normalized);
        byCustomer.set(address.customer_id, list);
      }

      return customers.map((customer) => ({
        ...customer,
        addresses: byCustomer.get(customer.id) || [],
        total_jobs: counts.get(customer.id) || 0,
      })) as Customer[];
    },
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: CustomerFormData) => saveCustomer(null, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer created successfully!");
    },
    onError: (error) => {
      console.error("Error creating customer:", error);
      toast.error("Failed to create customer");
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: CustomerFormData }) => saveCustomer(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer updated successfully!");
    },
    onError: (error) => {
      console.error("Error updating customer:", error);
      toast.error("Failed to update customer");
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").update({ status: "Inactive" }).eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer archived successfully!");
    },
    onError: (error) => {
      console.error("Error archiving customer:", error);
      toast.error("Failed to archive customer");
    },
  });
}

export function useBulkDeleteCustomers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) return { deleted: 0 };
      for (let index = 0; index < ids.length; index += 100) {
        const batch = ids.slice(index, index + 100);
        const { error } = await supabase.from("customers").update({ status: "Inactive" }).in("id", batch);
        if (error) throw error;
      }
      return { deleted: ids.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success(`${result.deleted} customers archived successfully!`);
    },
    onError: (error) => {
      console.error("Error archiving customers:", error);
      toast.error("Failed to archive customers");
    },
  });
}

function parseExcelDate(value: string | number | undefined): Date {
  if (!value) return new Date();
  if (typeof value === "number" || /^\d+$/.test(String(value))) {
    const serial = typeof value === "number" ? value : Number(value);
    return new Date(new Date(1899, 11, 30).getTime() + serial * 86_400_000);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function cell(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

function importedAddresses(row: ImportedCustomerRow): CustomerAddress[] {
  const result: CustomerAddress[] = [];
  for (let index = 1; index <= 10; index++) {
    const street = cell(row[`Address ${index} - Street`]);
    const city = cell(row[`Address ${index} - City`]);
    const state = cell(row[`Address ${index} - State`]);
    const postal = cell(row[`Address ${index} - Postal Code`]);
    if (![street, city, state, postal].some(Boolean)) continue;
    result.push({
      name: cell(row[`Address ${index} - Name`]) || `Address ${index}`,
      street,
      complement: cell(row[`Address ${index} - Complement`]),
      city,
      state,
      postal_code: postal,
      notes: cell(row[`Address ${index} - Notes`]),
      additional_notes: cell(row[`Address ${index} - Additional Notes`]),
      frequency: normalizeFrequency(cell(row[`Address ${index} - Frequency`]) || "Weekly") || "Weekly",
      preferred_day: normalizePreferredDay(cell(row[`Address ${index} - Preferred Day`]) || "monday") || "monday",
    });
  }
  return result;
}

export function useImportCustomers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rows: ImportedCustomerRow[]) => {
      const results = { success: 0, failed: 0, skipped: 0 };
      for (const row of rows) {
        const firstName = cell(row["First Name"]);
        const lastName = cell(row["Last Name"]);
        const legacyName = cell(row.Name);
        const email = cell(row.Email);
        const phone = cell(row["Phone 1"]);
        const fullName = `${firstName} ${lastName}`.trim() || legacyName || email.split("@")[0] || (phone ? `Customer ${phone}` : "");
        if (!fullName) {
          results.skipped++;
          continue;
        }

        const parts = fullName.split(/\s+/);
        const addresses = importedAddresses(row);
        const paymentMap: Record<string, string> = {
          "QuickBooks (QB)": "quickbooks",
          QuickBooks: "quickbooks",
          Cash: "cash",
          Check: "check",
          Venmo: "venmo",
          Zelle: "zelle",
        };

        try {
          await saveCustomer(null, {
            firstName: parts.shift() || fullName,
            lastName: parts.join(" "),
            email,
            phone1: phone,
            phone2: cell(row["Phone 2"]),
            status: cell(row.Status).toLowerCase() === "inactive" ? "inactive" : "active",
            paymentMethod: paymentMap[cell(row["Payment Method"])] || cell(row["Payment Method"]) || "quickbooks",
            customerSince: parseExcelDate(row["Customer Since"]),
            source: cell(row.Source).toLowerCase(),
            additionalInfo: cell(row.Notes),
            addresses,
          });
          results.success++;
        } catch (error) {
          console.error("Error importing customer:", error);
          results.failed++;
        }
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      const skipped = results.skipped ? ` (${results.skipped} skipped empty rows)` : "";
      if (!results.failed) toast.success(`${results.success} customers imported successfully!${skipped}`);
      else toast.warning(`Imported ${results.success} customers. ${results.failed} failed.${skipped}`);
    },
    onError: (error) => {
      console.error("Error importing customers:", error);
      toast.error("Failed to import customers");
    },
  });
}
