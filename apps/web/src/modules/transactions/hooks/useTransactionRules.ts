import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TransactionRule {
  id: string;
  name: string;
  condition: string;
  category: string;
  type: "receita" | "despesa";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransactionRuleFormData {
  name: string;
  condition: string;
  category: string;
  type: "receita" | "despesa";
  is_active?: boolean;
}

export function useTransactionRules() {
  return useQuery({
    queryKey: ["transaction_rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transaction_rules")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TransactionRule[];
    },
  });
}

export function useCreateTransactionRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: TransactionRuleFormData) => {
      const { data, error } = await supabase
        .from("transaction_rules")
        .insert({
          name: formData.name,
          condition: formData.condition,
          category: formData.category,
          type: formData.type,
          is_active: formData.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transaction_rules"] });
      toast.success("Regra criada com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating rule:", error);
      toast.error("Erro ao criar regra");
    },
  });
}

export function useUpdateTransactionRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...formData }: TransactionRuleFormData & { id: string }) => {
      const { data, error } = await supabase
        .from("transaction_rules")
        .update({
          name: formData.name,
          condition: formData.condition,
          category: formData.category,
          type: formData.type,
          is_active: formData.is_active,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transaction_rules"] });
      toast.success("Regra atualizada com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating rule:", error);
      toast.error("Erro ao atualizar regra");
    },
  });
}

export function useDeleteTransactionRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transaction_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transaction_rules"] });
      toast.success("Regra excluída com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting rule:", error);
      toast.error("Erro ao excluir regra");
    },
  });
}

export function useToggleTransactionRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from("transaction_rules")
        .update({ is_active })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transaction_rules"] });
    },
    onError: (error) => {
      console.error("Error toggling rule:", error);
      toast.error("Erro ao alterar status da regra");
    },
  });
}
