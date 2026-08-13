import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Transaction {
  id: string;
  name: string;
  description: string | null;
  date: string;
  category: string;
  status: string;
  amount: number;
  type: "receita" | "despesa";
  service_type: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionFormData {
  name: string;
  description?: string;
  date: string;
  category: string;
  status: string;
  amount: number;
  type: "receita" | "despesa";
  service_type?: string;
  notes?: string;
}

export function useTransactions() {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: TransactionFormData) => {
      const { data, error } = await supabase
        .from("transactions")
        .insert({
          name: formData.name,
          description: formData.description || null,
          date: formData.date,
          category: formData.category,
          status: formData.status,
          amount: formData.amount,
          type: formData.type,
          service_type: formData.service_type || null,
          notes: formData.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Transação criada com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating transaction:", error);
      toast.error("Erro ao criar transação");
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...formData }: TransactionFormData & { id: string }) => {
      const { data, error } = await supabase
        .from("transactions")
        .update({
          name: formData.name,
          description: formData.description || null,
          date: formData.date,
          category: formData.category,
          status: formData.status,
          amount: formData.amount,
          type: formData.type,
          service_type: formData.service_type || null,
          notes: formData.notes || null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Transação atualizada com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating transaction:", error);
      toast.error("Erro ao atualizar transação");
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Transação excluída com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting transaction:", error);
      toast.error("Erro ao excluir transação");
    },
  });
}
