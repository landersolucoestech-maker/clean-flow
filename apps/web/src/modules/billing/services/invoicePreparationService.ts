import { supabase } from "@/integrations/supabase/client";

export async function findInvoiceCustomerByName(name: string) {
  const { data, error } = await supabase
    .from("customers")
    .select("id, email")
    .ilike("name", name)
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function findOrCreateQuickBooksCustomer(name: string, email: string | null) {
  const { data: searchResult, error: searchError } = await supabase.functions.invoke("quickbooks-api", {
    body: {
      action: "search-customer",
      customerName: name,
    },
  });
  if (searchError) throw searchError;

  const existingId = searchResult?.customer?.Id as string | undefined;
  if (existingId) return { id: existingId, created: false };

  const { data: createResult, error: createError } = await supabase.functions.invoke("quickbooks-api", {
    body: {
      action: "create-customer",
      name,
      email,
    },
  });
  if (createError) throw createError;

  const createdId = createResult?.Customer?.Id as string | undefined;
  return createdId ? { id: createdId, created: true } : null;
}
