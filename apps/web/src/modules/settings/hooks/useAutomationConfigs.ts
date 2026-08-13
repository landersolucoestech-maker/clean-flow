import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AutomationConfig {
  id: string;
  trigger_type: string;
  label: string;
  category: string;
  delay_type: string | null;
  delay_value: number | null;
  send_at_time: string | null;
  condition: string | null;
  action: string;
  message_to: string;
  message: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAutomationData {
  trigger_type: string;
  label: string;
  category: string;
  delay_type?: string | null;
  delay_value?: number | null;
  send_at_time?: string | null;
  condition?: string | null;
  action?: string;
  message_to?: string;
  message: string;
  enabled?: boolean;
}

export function useAutomationConfigs() {
  return useQuery({
    queryKey: ["automation-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_configs")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as AutomationConfig[];
    },
  });
}

export function useCreateAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAutomationData) => {
      const { data: result, error } = await supabase
        .from("automation_configs")
        .insert({
          trigger_type: data.trigger_type,
          label: data.label,
          category: data.category,
          delay_type: data.delay_type || null,
          delay_value: data.delay_value || null,
          send_at_time: data.send_at_time || null,
          condition: data.condition || null,
          action: data.action || "send_message",
          message_to: data.message_to || "text_phone_1",
          message: data.message,
          enabled: data.enabled ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-configs"] });
      toast.success("Automation created successfully");
    },
    onError: (error) => {
      console.error("Error creating automation:", error);
      toast.error("Failed to create automation");
    },
  });
}

export function useUpdateAutomationConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<AutomationConfig> & { id: string }) => {
      const { id, ...rest } = updates;
      const { data, error } = await supabase
        .from("automation_configs")
        .update(rest)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-configs"] });
    },
    onError: (error) => {
      console.error("Error updating automation config:", error);
      toast.error("Failed to update automation");
    },
  });
}

export function useDeleteAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("automation_configs")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-configs"] });
      toast.success("Automation deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting automation:", error);
      toast.error("Failed to delete automation");
    },
  });
}

export function useToggleAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { data, error } = await supabase
        .from("automation_configs")
        .update({ enabled })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["automation-configs"] });
      toast.success(`Automation ${data.enabled ? "enabled" : "disabled"}`);
    },
    onError: (error) => {
      console.error("Error toggling automation:", error);
      toast.error("Failed to toggle automation");
    },
  });
}

// Bulk update multiple automation configs at once
export function useBulkUpdateAutomationConfigs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Array<Partial<AutomationConfig> & { id: string }>) => {
      const results = await Promise.all(
        updates.map(async ({ id, ...rest }) => {
          const { data, error } = await supabase
            .from("automation_configs")
            .update(rest)
            .eq("id", id)
            .select()
            .single();

          if (error) throw error;
          return data;
        })
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-configs"] });
      toast.success("All automations saved successfully");
    },
    onError: (error) => {
      console.error("Error bulk updating automation configs:", error);
      toast.error("Failed to save automations");
    },
  });
}

// Get automation config by trigger type
export function useAutomationByTrigger(triggerType: string) {
  return useQuery({
    queryKey: ["automation-configs", triggerType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_configs")
        .select("*")
        .eq("trigger_type", triggerType)
        .maybeSingle();

      if (error) throw error;
      return data as AutomationConfig | null;
    },
  });
}
