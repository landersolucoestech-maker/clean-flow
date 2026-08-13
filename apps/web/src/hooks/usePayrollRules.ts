import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PayrollRule {
  id?: string;
  staff_id: string;
  base_value: number;
  extra_value: number;
  bonus_weekly: number;
  bonus_monthly: number;
  bonus_yearly_1: number;
  bonus_yearly_2: number;
  bonus_performance: number;
  bonus_christmas: number;
  created_at?: string;
  updated_at?: string;
}

// Fetch all payroll rules
export function usePayrollRules() {
  return useQuery({
    queryKey: ["payroll_rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_rules")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as PayrollRule[];
    },
  });
}

// Upsert payroll rules (insert or update)
export function useSavePayrollRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rules: Omit<PayrollRule, "id" | "created_at" | "updated_at">[]) => {
      // Use upsert to insert or update based on staff_id
      const { data, error } = await supabase
        .from("payroll_rules")
        .upsert(
          rules.map((rule) => ({
            staff_id: rule.staff_id,
            base_value: rule.base_value,
            extra_value: rule.extra_value,
            bonus_weekly: rule.bonus_weekly,
            bonus_monthly: rule.bonus_monthly,
            bonus_yearly_1: rule.bonus_yearly_1,
            bonus_yearly_2: rule.bonus_yearly_2,
            bonus_performance: rule.bonus_performance,
            bonus_christmas: rule.bonus_christmas,
          })),
          { onConflict: "staff_id" }
        )
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_rules"] });
      toast.success("Regras de pagamento salvas com sucesso!");
    },
    onError: (error) => {
      console.error("Error saving payroll rules:", error);
      toast.error("Erro ao salvar regras de pagamento");
    },
  });
}

// Delete a payroll rule
export function useDeletePayrollRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (staffId: string) => {
      const { error } = await supabase
        .from("payroll_rules")
        .delete()
        .eq("staff_id", staffId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_rules"] });
      toast.success("Regra removida com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting payroll rule:", error);
      toast.error("Erro ao remover regra");
    },
  });
}
