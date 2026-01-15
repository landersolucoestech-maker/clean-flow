import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CustomerRelationship {
  id: string;
  customer_id: string;
  start_date: string;
  end_date: string | null;
  end_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRelationshipData {
  customer_id: string;
  start_date: string;
  end_date?: string | null;
  end_reason?: string | null;
  notes?: string | null;
}

export interface UpdateRelationshipData {
  id: string;
  start_date?: string;
  end_date?: string | null;
  end_reason?: string | null;
  notes?: string | null;
}

// Fetch all relationships for a customer
export function useCustomerRelationships(customerId: string | null) {
  return useQuery({
    queryKey: ["customer-relationships", customerId],
    queryFn: async () => {
      if (!customerId) return [];
      
      const { data, error } = await supabase
        .from("customer_relationships")
        .select("*")
        .eq("customer_id", customerId)
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data as CustomerRelationship[];
    },
    enabled: !!customerId,
  });
}

// Create a new relationship period
export function useCreateRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRelationshipData) => {
      const { data: relationship, error } = await supabase
        .from("customer_relationships")
        .insert({
          customer_id: data.customer_id,
          start_date: data.start_date,
          end_date: data.end_date || null,
          end_reason: data.end_reason || null,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return relationship;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customer-relationships", variables.customer_id] });
      toast.success("Relationship period added successfully");
    },
    onError: (error) => {
      console.error("Error creating relationship:", error);
      toast.error("Failed to add relationship period");
    },
  });
}

// Update an existing relationship period
export function useUpdateRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateRelationshipData) => {
      const { id, ...updateData } = data;
      const { error } = await supabase
        .from("customer_relationships")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-relationships"] });
      toast.success("Relationship period updated successfully");
    },
    onError: (error) => {
      console.error("Error updating relationship:", error);
      toast.error("Failed to update relationship period");
    },
  });
}

// End an active relationship (set end_date)
export function useEndRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, end_date, end_reason }: { id: string; end_date: string; end_reason?: string }) => {
      const { error } = await supabase
        .from("customer_relationships")
        .update({ 
          end_date, 
          end_reason: end_reason || null 
        })
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-relationships"] });
      toast.success("Relationship ended successfully");
    },
    onError: (error) => {
      console.error("Error ending relationship:", error);
      toast.error("Failed to end relationship");
    },
  });
}

// Delete a relationship period
export function useDeleteRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("customer_relationships")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-relationships"] });
      toast.success("Relationship period deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting relationship:", error);
      toast.error("Failed to delete relationship period");
    },
  });
}
