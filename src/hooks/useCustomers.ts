import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  // Billing Contact fields
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
  // Billing Contact fields
  billingContactName?: string;
  billingContactRelationship?: string;
  billingContactEmail?: string;
  billingContactPhone?: string;
  billingContactPhone2?: string;
  billingContactNotes?: string;
}

// Normalize frequency/preferred_day values coming from DB/import so dropdowns can select correctly
// Uses centralized enums from serviceEnums.ts
import { FREQUENCY_OPTIONS, normalizeFrequency as normalizeFrequencyFromEnums } from "@/lib/serviceEnums";

const normalizeFrequency = (value: unknown): string | null => {
  if (!value) return null;
  const v = String(value).trim();
  
  // Try centralized normalization first (new enum values)
  const normalized = normalizeFrequencyFromEnums(v);
  if (normalized) return normalized;

  // Check if it's already a valid new enum value
  if (FREQUENCY_OPTIONS.includes(v as any)) return v;

  // Legacy value mapping for backwards compatibility
  const legacyMap: Record<string, string> = {
    "one-time": "One-Time",
    "daily": "Daily",
    "weekly": "Weekly",
    "every-2-weeks": "Regular Cleaning 2 Weeks",
    "every-3-weeks": "Regular Cleaning 3 Weeks",
    "every-4-weeks": "Regular Cleaning 4 Weeks",
    "every-other-day": "Daily", // Map to closest
    "every-5-weeks": "Regular Cleaning 4 Weeks",
    "every-6-weeks": "Regular Cleaning 4 Weeks",
    "every-7-weeks": "Regular Cleaning 4 Weeks",
    "every-8-weeks": "Regular Cleaning 4 Weeks",
    "first-of-month": "Regular Cleaning 4 Weeks",
    "second-of-month": "Regular Cleaning 4 Weeks",
    "third-of-month": "Regular Cleaning 4 Weeks",
    "fourth-of-month": "Regular Cleaning 4 Weeks",
    "last-of-month": "Regular Cleaning 4 Weeks",
    // Old display values
    "One Time": "One-Time",
    "Every Other Day": "Daily",
    "Every 2 Weeks": "Regular Cleaning 2 Weeks",
    "Every 3 Weeks": "Regular Cleaning 3 Weeks",
    "Every 4 Weeks": "Regular Cleaning 4 Weeks",
    "Every 5 Weeks": "Regular Cleaning 4 Weeks",
    "Every 6 Weeks": "Regular Cleaning 4 Weeks",
    "Every 7 Weeks": "Regular Cleaning 4 Weeks",
    "Every 8 Weeks": "Regular Cleaning 4 Weeks",
    "First of Month": "Regular Cleaning 4 Weeks",
    "Second of Month": "Regular Cleaning 4 Weeks",
    "Third of Month": "Regular Cleaning 4 Weeks",
    "Fourth of Month": "Regular Cleaning 4 Weeks",
    "Last of Month": "Regular Cleaning 4 Weeks",
  };

  if (legacyMap[v]) return legacyMap[v];
  
  const lower = v.toLowerCase();
  if (legacyMap[lower]) return legacyMap[lower];

  return v; // Return as-is if no mapping found
};

const normalizePreferredDay = (value: unknown): string | null => {
  if (!value) return null;
  const v = String(value).trim();

  const allowed = new Set([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ]);

  if (allowed.has(v)) return v;

  const map: Record<string, string> = {
    "Monday": "monday",
    "Tuesday": "tuesday",
    "Wednesday": "wednesday",
    "Thursday": "thursday",
    "Friday": "friday",
    "Saturday": "saturday",
    "Sunday": "sunday",
  };

  if (map[v]) return map[v];

  const lower = v.toLowerCase();
  if (allowed.has(lower)) return lower;

  return null;
};

// Fetch all customers with their addresses
export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      // Fetch ALL rows (no hard cap). We page manually to bypass the default 1000-row limit.
      const pageSize = 1000;

      const allCustomers: any[] = [];
      for (let from = 0; ; from += pageSize) {
        const to = from + pageSize - 1;
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          // deterministic order for paging
          .order("name", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allCustomers.push(...data);
        if (data.length < pageSize) break;
      }

      const allAddresses: any[] = [];
      for (let from = 0; ; from += pageSize) {
        const to = from + pageSize - 1;
        const { data, error } = await supabase
          .from("customer_addresses")
          .select("*")
          .order("customer_id", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allAddresses.push(...data);
        if (data.length < pageSize) break;
      }

      // Fetch all jobs to calculate real job counts per customer
      const allJobs: any[] = [];
      for (let from = 0; ; from += pageSize) {
        const to = from + pageSize - 1;
        const { data, error } = await supabase
          .from("jobs")
          .select("id, customer_id")
          .order("customer_id", { ascending: true })
          .range(from, to);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allJobs.push(...data);
        if (data.length < pageSize) break;
      }

      // Calculate job counts per customer
      const jobCountsByCustomer: Record<string, number> = {};
      for (const job of allJobs) {
        if (job.customer_id) {
          jobCountsByCustomer[job.customer_id] = (jobCountsByCustomer[job.customer_id] || 0) + 1;
        }
      }

      const normalizedAddresses = (allAddresses ?? []).map((addr: any) => ({
        ...addr,
        frequency: normalizeFrequency(addr.frequency) ?? addr.frequency,
        preferred_day: normalizePreferredDay(addr.preferred_day) ?? addr.preferred_day,
      }));

      const customersWithAddresses = (allCustomers ?? []).map((customer) => ({
        ...customer,
        addresses: normalizedAddresses.filter((addr) => addr.customer_id === customer.id) || [],
        total_jobs: jobCountsByCustomer[customer.id] || 0,
      }));

      return customersWithAddresses as Customer[];
    },
  });
}

// Create a new customer
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: CustomerFormData) => {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      
      // Insert customer
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .insert({
          name: fullName,
          email: formData.email || null,
          phone: formData.phone1 || null,
          phone2: formData.phone2 || null,
          address: formData.addresses[0] ? `${formData.addresses[0].street || ""}, ${formData.addresses[0].city || ""}, ${formData.addresses[0].state || ""} ${formData.addresses[0].postal_code || ""}`.trim().replace(/^,\s*/, "").replace(/,\s*$/, "") : null,
          status: formData.status === "active" ? "Active" : "Inactive",
          payment_method: formData.paymentMethod,
          customer_since: formData.customerSince.toISOString().split("T")[0],
          source: formData.source || null,
          additional_info: formData.additionalInfo || null,
          // Billing Contact fields
          billing_contact_name: formData.billingContactName || null,
          billing_contact_relationship: formData.billingContactRelationship || null,
          billing_contact_email: formData.billingContactEmail || null,
          billing_contact_phone: formData.billingContactPhone || null,
          billing_contact_phone2: formData.billingContactPhone2 || null,
          billing_contact_notes: formData.billingContactNotes || null,
        })
        .select()
        .single();

      if (customerError) throw customerError;

      // Insert addresses
      if (formData.addresses.length > 0) {
        const addressesToInsert = formData.addresses.map((addr) => ({
          customer_id: customer.id,
          name: addr.name,
          street: addr.street || null,
          complement: addr.complement || null,
          city: addr.city || null,
          state: addr.state || null,
          postal_code: addr.postal_code || null,
          address: `${addr.street || ""}, ${addr.city || ""}, ${addr.state || ""} ${addr.postal_code || ""}`.trim().replace(/^,\s*/, "").replace(/,\s*$/, ""),
          notes: addr.notes || null,
          additional_notes: addr.additional_notes || null,
          frequency: addr.frequency,
          preferred_day: addr.preferred_day,
        }));

        const { error: addressError } = await supabase
          .from("customer_addresses")
          .insert(addressesToInsert);

        if (addressError) throw addressError;
      }

      return customer;
    },
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

// Update an existing customer
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: CustomerFormData }) => {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      
      // Update customer
      const { error: customerError } = await supabase
        .from("customers")
        .update({
          name: fullName,
          email: formData.email || null,
          phone: formData.phone1 || null,
          phone2: formData.phone2 || null,
          address: formData.addresses[0] ? `${formData.addresses[0].street || ""}, ${formData.addresses[0].city || ""}, ${formData.addresses[0].state || ""} ${formData.addresses[0].postal_code || ""}`.trim().replace(/^,\s*/, "").replace(/,\s*$/, "") : null,
          status: formData.status === "active" ? "Active" : "Inactive",
          payment_method: formData.paymentMethod,
          customer_since: formData.customerSince.toISOString().split("T")[0],
          source: formData.source || null,
          additional_info: formData.additionalInfo || null,
          // Billing Contact fields
          billing_contact_name: formData.billingContactName || null,
          billing_contact_relationship: formData.billingContactRelationship || null,
          billing_contact_email: formData.billingContactEmail || null,
          billing_contact_phone: formData.billingContactPhone || null,
          billing_contact_phone2: formData.billingContactPhone2 || null,
          billing_contact_notes: formData.billingContactNotes || null,
        })
        .eq("id", id);

      if (customerError) throw customerError;

      // Delete existing addresses and insert new ones
      const { error: deleteError } = await supabase
        .from("customer_addresses")
        .delete()
        .eq("customer_id", id);

      if (deleteError) throw deleteError;

      // Insert new addresses
      if (formData.addresses.length > 0) {
        const addressesToInsert = formData.addresses.map((addr) => ({
          customer_id: id,
          name: addr.name,
          street: addr.street || null,
          complement: addr.complement || null,
          city: addr.city || null,
          state: addr.state || null,
          postal_code: addr.postal_code || null,
          address: `${addr.street || ""}, ${addr.city || ""}, ${addr.state || ""} ${addr.postal_code || ""}`.trim().replace(/^,\s*/, "").replace(/,\s*$/, ""),
          notes: addr.notes || null,
          additional_notes: addr.additional_notes || null,
          frequency: addr.frequency,
          preferred_day: addr.preferred_day,
        }));

        const { error: addressError } = await supabase
          .from("customer_addresses")
          .insert(addressesToInsert);

        if (addressError) throw addressError;
      }

      return id;
    },
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

// Delete a customer
export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer deleted successfully!");
    },
    onError: (error) => {
      console.error("Error deleting customer:", error);
      toast.error("Failed to delete customer");
    },
  });
}

// Bulk delete customers
export function useBulkDeleteCustomers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return { deleted: 0 };

      // Delete in batches of 100 to avoid query limits
      const batchSize = 100;
      let totalDeleted = 0;

      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const { error } = await supabase
          .from("customers")
          .delete()
          .in("id", batch);

        if (error) throw error;
        totalDeleted += batch.length;
      }

      return { deleted: totalDeleted };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success(`${result.deleted} customers deleted successfully!`);
    },
    onError: (error) => {
      console.error("Error deleting customers:", error);
      toast.error("Failed to delete customers");
    },
  });
}

// Import data structure from Excel
export interface ImportedCustomerRow {
  "First Name"?: string;
  "Last Name"?: string;
  "Name"?: string; // Keep for backwards compatibility
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

// Helper function to convert Excel serial date to YYYY-MM-DD format
function parseExcelDate(value: string | number | undefined): string | null {
  if (!value) return null;
  
  // If it's already a valid date string (YYYY-MM-DD), return it
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  
  // If it's a number (Excel serial date), convert it
  if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) {
    const serialNumber = typeof value === 'number' ? value : parseInt(value, 10);
    // Excel serial date: days since 1899-12-30 (accounting for Excel's leap year bug)
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + serialNumber * 24 * 60 * 60 * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Try to parse other date formats
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return null;
}

// Import customers from Excel data
export function useImportCustomers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rows: ImportedCustomerRow[]) => {
      const results = { success: 0, failed: 0, skipped: 0 };

      const cellString = (value: unknown) => (value === null || value === undefined ? "" : String(value)).trim();

      for (const row of rows) {
        try {
          const firstName = cellString(row["First Name"]);
          const lastName = cellString(row["Last Name"]);
          const name = cellString(row["Name"]);
          const email = cellString(row["Email"]);
          const phone1 = cellString(row["Phone 1"]);

          // Build full name from First Name + Last Name or use Name column.
          // If missing, fall back to email/phone so we don't silently skip rows.
          let fullName = "";
          if (firstName || lastName) {
            fullName = `${firstName} ${lastName}`.trim();
          } else if (name) {
            fullName = name;
          } else if (email) {
            fullName = email.split("@")[0] || email;
          } else if (phone1) {
            fullName = `Customer ${phone1}`;
          }

          // Skip truly empty rows (no identifier)
          if (!fullName) {
            results.skipped++;
            continue;
          }

          // Parse payment method to match database format
          const paymentMethodMap: Record<string, string> = {
            "QuickBooks (QB)": "quickbooks",
            "QuickBooks": "quickbooks",
            "Cash": "cash",
            "Check": "check",
            "Venmo": "venmo",
            "Zelle": "zelle",
          };

          // Parse source to match database format
          const sourceMap: Record<string, string> = {
            "Website": "website",
            "Phone": "phone",
            "Google": "google",
            "Facebook": "facebook",
            "Instagram": "instagram",
            "Nextdoor": "nextdoor",
            "Walk-in": "walk-in",
            "Referral": "referral",
          };

          const rawSource = cellString(row["Source"]);
          const rawReferralName = cellString((row as any)["Referral Name"]);

          let sourceValue: string | null = null;
          if (rawSource) {
            const lower = rawSource.toLowerCase();

            // Supports legacy format: "referral:John Doe"
            if (lower.startsWith("referral:")) {
              const refName = rawSource.split(":").slice(1).join(":").trim();
              sourceValue = refName ? `referral:${refName}` : "referral";
            } else {
              const lowerMap: Record<string, string> = {
                website: "website",
                phone: "phone",
                google: "google",
                facebook: "facebook",
                instagram: "instagram",
                nextdoor: "nextdoor",
                "walk-in": "walk-in",
                referral: "referral",
              };

              sourceValue = lowerMap[lower] || sourceMap[rawSource] || lower;
            }
          }

          // If file has separate referral name column, persist using our internal format.
          if ((!sourceValue || sourceValue === "referral") && rawReferralName) {
            sourceValue = `referral:${rawReferralName}`;
          }

          // Build first address from row for customer.address field
          const firstStreet = cellString(row["Address 1 - Street"]);
          const firstCity = cellString(row["Address 1 - City"]);
          const firstState = cellString(row["Address 1 - State"]);
          const firstPostal = cellString(row["Address 1 - Postal Code"]);
          const firstAddressStr = [firstStreet, firstCity, firstState, firstPostal].filter(Boolean).join(", ");

          // Parse dates from Excel format
          const customerSince = parseExcelDate(row["Customer Since"]);
          const lastService = parseExcelDate(row["Last Service"]);

          // Insert customer
          const { data: customer, error: customerError } = await supabase
            .from("customers")
            .insert({
              name: fullName,
              email: email || null,
              phone: phone1 || null,
              phone2: cellString(row["Phone 2"]) || null,
              address: firstAddressStr || null,
              status: cellString(row["Status"]) || "Active",
              payment_method: paymentMethodMap[cellString(row["Payment Method"]) || ""] || cellString(row["Payment Method"]) || "quickbooks",
              source: sourceValue,
              customer_since: customerSince,
              last_service: lastService,
              total_jobs: Number(row["Total Jobs"]) || 0,
              revenue: Number(row["Revenue"]) || 0,
              rating: Number(row["Rating"]) || 5,
              notes: cellString(row["Notes"]) || null,
            })
            .select()
            .single();

          if (customerError) {
            console.error("Error inserting customer:", customerError);
            results.failed++;
            continue;
          }

          // Frequency mapping - use centralized enums
          // Store new standardized values directly in database
          const frequencyMap: Record<string, string> = {
            // Map old Excel labels to new standardized values
            "One Time": "One-Time",
            "Daily": "Daily",
            "Every Other Day": "Daily",
            "Weekly": "Weekly",
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
            // Bi-Weekly variations
            "Bi-Weekly": "Regular Cleaning 2 Weeks",
            "Biweekly": "Regular Cleaning 2 Weeks",
            "bi-weekly": "Regular Cleaning 2 Weeks",
          };

          // Preferred day mapping from Excel labels to database values
          const dayMap: Record<string, string> = {
            "Monday": "monday",
            "Tuesday": "tuesday",
            "Wednesday": "wednesday",
            "Thursday": "thursday",
            "Friday": "friday",
            "Saturday": "saturday",
            "Sunday": "sunday",
          };

          // Collect addresses from the row
          const addresses: Array<{
            name: string;
            street: string;
            complement: string;
            city: string;
            state: string;
            postal_code: string;
            frequency: string;
            preferred_day: string;
            notes: string;
            additional_notes: string;
          }> = [];
          
          for (let i = 1; i <= 10; i++) {
            const streetKey = `Address ${i} - Street`;
            const nameKey = `Address ${i} - Name`;
            const complementKey = `Address ${i} - Complement`;
            const cityKey = `Address ${i} - City`;
            const stateKey = `Address ${i} - State`;
            const postalKey = `Address ${i} - Postal Code`;
            const frequencyKey = `Address ${i} - Frequency`;
            const preferredDayKey = `Address ${i} - Preferred Day`;
            const notesKey = `Address ${i} - Notes`;
            const additionalNotesKey = `Address ${i} - Additional Notes`;
            
            // Check if this address has any data
            if (row[streetKey] || row[cityKey] || row[stateKey] || row[postalKey]) {
              const rawFrequency = (row[frequencyKey] as string) || "";
              const rawPreferredDay = (row[preferredDayKey] as string) || "";
              
              addresses.push({
                name: (row[nameKey] as string) || `Address ${i}`,
                street: (row[streetKey] as string) || "",
                complement: (row[complementKey] as string) || "",
                city: (row[cityKey] as string) || "",
                state: (row[stateKey] as string) || "",
                postal_code: (row[postalKey] as string) || "",
                frequency: frequencyMap[rawFrequency] || rawFrequency.toLowerCase() || "weekly",
                preferred_day: dayMap[rawPreferredDay] || rawPreferredDay.toLowerCase() || "monday",
                notes: (row[notesKey] as string) || "",
                additional_notes: (row[additionalNotesKey] as string) || "",
              });
            }
          }

          // Insert addresses
          if (addresses.length > 0) {
            const addressesToInsert = addresses.map((addr) => ({
              customer_id: customer.id,
              name: addr.name,
              street: addr.street || null,
              complement: addr.complement || null,
              city: addr.city || null,
              state: addr.state || null,
              postal_code: addr.postal_code || null,
              address: [addr.street, addr.city, addr.state, addr.postal_code].filter(Boolean).join(", "),
              notes: addr.notes || null,
              additional_notes: addr.additional_notes || null,
              frequency: addr.frequency || "weekly",
              preferred_day: addr.preferred_day || "monday",
            }));

            const { error: addressError } = await supabase
              .from("customer_addresses")
              .insert(addressesToInsert);

            if (addressError) {
              console.error("Error inserting addresses:", addressError);
            }
          }

          results.success++;
        } catch (error) {
          console.error("Error processing row:", error);
          results.failed++;
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      const extra = results.skipped ? ` (${results.skipped} skipped empty rows)` : "";

      if (results.failed === 0) {
        toast.success(`${results.success} customers imported successfully!${extra}`);
      } else {
        toast.warning(`Imported ${results.success} customers. ${results.failed} failed.${extra}`);
      }
    },
    onError: (error) => {
      console.error("Error importing customers:", error);
      toast.error("Failed to import customers");
    },
  });
}
