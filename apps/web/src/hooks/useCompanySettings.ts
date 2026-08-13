import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

export interface CompanySettings {
  id: string;
  legal_name: string;
  trade_name: string;
  tax_id: string | null;
  country: string | null;
  currency: string | null;
  timezone: string | null;
  locale: string | null;
  date_format: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  business_hours: BusinessHours[] | null;
  google_review_url: string | null;
  nextdoor_review_url: string | null;
  review_delay_minutes: number | null;
  review_trigger: string | null;
  review_delay_type: string | null;
  review_message_to: string | null;
  gps_distance_threshold: number | null;
  gps_alert_sms_enabled: boolean | null;
  gps_alert_sms_to: string | null;
  zelle_payment_key: string | null;
  venmo_payment_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessHours {
  day: string;
  open: string;
  close: string;
  isOpen: boolean;
}

// Helper to parse business_hours from Json to BusinessHours[]
const parseBusinessHours = (data: Json | null): BusinessHours[] | null => {
  if (!data) return null;
  if (Array.isArray(data)) {
    return data as unknown as BusinessHours[];
  }
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return null;
};

export const useCompanySettings = () => {
  return useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;
      
      return {
        ...data,
        business_hours: parseBusinessHours(data.business_hours),
      } as CompanySettings;
    },
  });
};

export const useUpdateCompanySettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<CompanySettings> & { id: string }) => {
      const { id, business_hours, ...rest } = updates;
      
      const updateData: Record<string, unknown> = { ...rest };
      if (business_hours !== undefined) {
        updateData.business_hours = business_hours as unknown as Json;
      }
      
      const { data: result, error } = await supabase
        .from("company_settings")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating company settings:", error);
      toast.error("Erro ao salvar configurações");
    },
  });
};

export const useCreateCompanySettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<CompanySettings>) => {
      const { business_hours, ...rest } = data;
      
      const insertData: Record<string, unknown> = { ...rest };
      if (business_hours !== undefined) {
        insertData.business_hours = business_hours as unknown as Json;
      }
      
      const { data: result, error } = await supabase
        .from("company_settings")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      toast.success("Configurações criadas com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating company settings:", error);
      toast.error("Erro ao criar configurações");
    },
  });
};
