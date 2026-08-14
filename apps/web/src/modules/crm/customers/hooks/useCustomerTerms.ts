import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CustomerTerm {
  id: string;
  customer_id: string;
  term_name: string;
  term_description: string | null;
  signed_by: string;
  signed_at: string;
  signature_text: string | null;
  ip_address: string | null;
  document_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useCustomerTerms(customerId: string | null) {
  return useQuery({
    queryKey: ["customer-terms", customerId],
    queryFn: async () => {
      if (!customerId) return [];
      
      const { data, error } = await supabase
        .from("customer_terms")
        .select("*")
        .eq("customer_id", customerId)
        .order("signed_at", { ascending: false });

      if (error) {
        console.error("Error fetching customer terms:", error);
        throw error;
      }

      return data as CustomerTerm[];
    },
    enabled: !!customerId,
  });
}
