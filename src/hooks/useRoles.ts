import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Role {
  id: string;
  name: string;
  permissions: string[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

// Fetch all roles
export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Role[];
    },
  });
}

// Create a new role
export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; permissions: string[] }) => {
      const { data: role, error } = await supabase
        .from("roles")
        .insert({
          name: data.name,
          permissions: data.permissions,
          is_system: false,
        })
        .select()
        .single();

      if (error) throw error;
      return role;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

// Update a role
export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; permissions?: string[] }) => {
      const { data: role, error } = await supabase
        .from("roles")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return role;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

// Delete a role
export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("roles")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}
