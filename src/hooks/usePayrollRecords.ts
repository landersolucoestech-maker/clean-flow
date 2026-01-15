import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Pattern for valid job link in notes: "Job XXXXXXXX • YYYY-MM-DD"
const JOB_LINK_PATTERN = /^Job\s+[a-f0-9]{8}\s+•\s+\d{4}-\d{2}-\d{2}$/i;

// Validates that notes field has a valid job link
function validateJobLink(notes: string | null | undefined): boolean {
  if (!notes) return false;
  return JOB_LINK_PATTERN.test(notes.trim());
}

export interface PayrollRecord {
  id: string;
  period_start: string;
  period_end: string;
  employee_name: string;
  staff_id: string | null;
  job_id: string | null;
  cleaning_type: string | null;
  client: string | null;
  base_value: number;
  bonus: number;
  total: number;
  payment_type: string;
  status: "Pending" | "Paid" | "Overdue";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollRecordFormData {
  period_start: string;
  period_end: string;
  employee_name: string;
  staff_id?: string;
  job_id?: string;
  cleaning_type?: string;
  client?: string;
  base_value: number;
  bonus?: number;
  total?: number;
  payment_type?: string;
  status?: "Pending" | "Paid" | "Overdue";
  notes?: string;
}

export function usePayrollRecords() {
  return useQuery({
    queryKey: ["payroll_records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_records")
        .select("*")
        .order("period_start", { ascending: false });

      if (error) throw error;
      return data as PayrollRecord[];
    },
  });
}

export function useCreatePayrollRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: PayrollRecordFormData) => {
      // Validate job link in notes
      if (!validateJobLink(formData.notes)) {
        throw new Error("Payroll record must be linked to a job. Notes must contain 'Job XXXXXXXX • YYYY-MM-DD'");
      }

      // Validate staff_id is provided
      if (!formData.staff_id) {
        throw new Error("Payroll record must have a staff_id");
      }

      const total = formData.total ?? (formData.base_value + (formData.bonus || 0));
      
      const { data, error } = await supabase
        .from("payroll_records")
        .insert({
          period_start: formData.period_start,
          period_end: formData.period_end,
          employee_name: formData.employee_name,
          staff_id: formData.staff_id,
          job_id: formData.job_id || null,
          cleaning_type: formData.cleaning_type || null,
          client: formData.client || null,
          base_value: formData.base_value,
          bonus: formData.bonus || 0,
          total,
          payment_type: formData.payment_type || "Direct Deposit",
          status: formData.status || "Pending",
          notes: formData.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_records"] });
      toast.success("Registro de payroll criado!");
    },
    onError: (error) => {
      console.error("Error creating payroll record:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao criar registro de payroll");
    },
  });
}

export function useCreatePayrollRecords() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (records: PayrollRecordFormData[]) => {
      // Validate all records have job links and staff_id
      const invalidRecords = records.filter(
        (r) => !validateJobLink(r.notes) || !r.staff_id
      );
      
      if (invalidRecords.length > 0) {
        throw new Error(
          `${invalidRecords.length} registro(s) inválido(s): todos devem ter staff_id e notes no formato 'Job XXXXXXXX • YYYY-MM-DD'`
        );
      }

      const formattedRecords = records.map((formData) => ({
        period_start: formData.period_start,
        period_end: formData.period_end,
        employee_name: formData.employee_name,
        staff_id: formData.staff_id!, // Already validated above
        job_id: formData.job_id || null,
        cleaning_type: formData.cleaning_type || null,
        client: formData.client || null,
        base_value: formData.base_value,
        bonus: formData.bonus || 0,
        total: formData.total ?? (formData.base_value + (formData.bonus || 0)),
        payment_type: formData.payment_type || "Direct Deposit",
        status: formData.status || "Pending",
        notes: formData.notes!, // Already validated above
      }));

      const { data, error } = await supabase
        .from("payroll_records")
        .insert(formattedRecords)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_records"] });
      toast.success("Registros de payroll criados!");
    },
    onError: (error) => {
      console.error("Error creating payroll records:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao criar registros de payroll");
    },
  });
}

export function useUpdatePayrollRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...formData }: PayrollRecordFormData & { id: string }) => {
      const total = formData.total ?? (formData.base_value + (formData.bonus || 0));
      
      const { data, error } = await supabase
        .from("payroll_records")
        .update({
          period_start: formData.period_start,
          period_end: formData.period_end,
          employee_name: formData.employee_name,
          staff_id: formData.staff_id || null,
          job_id: formData.job_id || null,
          cleaning_type: formData.cleaning_type || null,
          client: formData.client || null,
          base_value: formData.base_value,
          bonus: formData.bonus || 0,
          total,
          payment_type: formData.payment_type || "Direct Deposit",
          status: formData.status || "Pending",
          notes: formData.notes || null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_records"] });
      toast.success("Registro atualizado!");
    },
    onError: (error) => {
      console.error("Error updating payroll record:", error);
      toast.error("Erro ao atualizar registro");
    },
  });
}

export function useUpdatePayrollStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: "Pending" | "Paid" | "Overdue" }) => {
      const { data, error } = await supabase
        .from("payroll_records")
        .update({ status })
        .in("id", ids)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_records"] });
      toast.success("Status atualizado!");
    },
    onError: (error) => {
      console.error("Error updating payroll status:", error);
      toast.error("Erro ao atualizar status");
    },
  });
}

export function useDeletePayrollRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payroll_records").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_records"] });
      toast.success("Registro excluído!");
    },
    onError: (error) => {
      console.error("Error deleting payroll record:", error);
      toast.error("Erro ao excluir registro");
    },
  });
}

export function useDeletePayrollRecords() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("payroll_records").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_records"] });
    },
    onError: (error) => {
      console.error("Error deleting payroll records:", error);
      toast.error("Erro ao excluir registros");
    },
  });
}
