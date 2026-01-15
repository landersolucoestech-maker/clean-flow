import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Enums } from "@/integrations/supabase/types";
import { toast } from "sonner";

type AppRole = Enums<"app_role">;

export interface Staff {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_driver: boolean;
  is_active: boolean;
  team: string | null;
  payment_method: string | null;
  zelle_key: string | null;
  quickbooks_vendor_id: string | null;
  created_at: string;
  updated_at: string;
  staff_roles?: { role: AppRole } | null;
}

export interface StaffFormData {
  name: string;
  email?: string;
  phone?: string;
  is_driver?: boolean;
  is_active?: boolean;
  team?: string;
  role?: AppRole;
  payment_method?: string;
  zelle_key?: string;
  quickbooks_vendor_id?: string;
}

// Fetch all staff members
export function useStaff() {
  return useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("*, staff_roles(role)")
        .order("name", { ascending: true });

      if (error) throw error;

      const normalized = (data || []).map((s: any) => ({
        ...s,
        // PostgREST may return 1:1 joins as an array; normalize to object
        staff_roles: Array.isArray(s.staff_roles) ? (s.staff_roles[0] ?? null) : (s.staff_roles ?? null),
      }));

      return normalized as Staff[];
    },
  });
}

// Fetch only staff members that should appear in the Schedule sidebar
// (cleaners + drivers). Uses a single query and filters client-side.
export function useCleanersAndDrivers() {
  return useQuery({
    queryKey: ["staff", "cleaners-drivers", "v6"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("*, staff_roles(role)")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;

      const normalized = (data || []).map((s: any) => ({
        ...s,
        staff_roles: Array.isArray(s.staff_roles) ? (s.staff_roles[0] ?? null) : (s.staff_roles ?? null),
      }));

      const allowedRoles = new Set<AppRole>(["cleaner", "driver"]);

      return normalized
        .map((s: any) => {
          const roleFromDb = s.staff_roles?.role as AppRole | undefined;
          const role: AppRole | undefined = roleFromDb ?? (s.is_driver ? "driver" : undefined);

          return {
            ...s,
            role: role ?? "cleaner",
            // Driver icon should reflect role
            is_driver: role === "driver",
          };
        })
        .filter((s: any) => allowedRoles.has(s.role)) as (Staff & { role: AppRole })[];
    },
  });
}

// Fetch staff members by team number
export function useStaffByTeam(teamNumber: string | null) {
  return useQuery({
    queryKey: ["staff", "by-team", teamNumber],
    queryFn: async () => {
      if (!teamNumber) return [];
      
      const { data, error } = await supabase
        .from("staff")
        .select("id, name, team")
        .eq("team", teamNumber)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!teamNumber,
  });
}

// Create a new staff member
export function useCreateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: StaffFormData) => {
      const role: AppRole = formData.role ?? (formData.is_driver ? "driver" : "cleaner");

      const { data, error } = await supabase
        .from("staff")
        .insert({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          is_driver: formData.is_driver ?? role === "driver",
          is_active: formData.is_active ?? true,
          team: formData.team || null,
          payment_method: formData.payment_method || "zelle",
          zelle_key: formData.zelle_key || null,
          quickbooks_vendor_id: formData.quickbooks_vendor_id || null,
        })
        .select("*, staff_roles(role)")
        .single();

      if (error) throw error;

      // Persist role to staff_roles (source of truth)
      const { error: roleError } = await supabase
        .from("staff_roles")
        .upsert([{ staff_id: data.id, role }], { onConflict: "staff_id" });

      if (roleError) throw roleError;

      const normalized: any = {
        ...data,
        staff_roles: Array.isArray((data as any).staff_roles)
          ? ((data as any).staff_roles[0] ?? null)
          : ((data as any).staff_roles ?? null),
      };

      return normalized;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["staff", "cleaners-drivers"] });
      toast.success("Staff member created successfully!");
    },
    onError: (error) => {
      console.error("Error creating staff member:", error);
      toast.error("Failed to create staff member");
    },
  });
}

// Update a staff member
export function useUpdateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...formData }: StaffFormData & { id: string }) => {
      const role: AppRole = formData.role ?? (formData.is_driver ? "driver" : "cleaner");

      const { data, error } = await supabase
        .from("staff")
        .update({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          is_driver: formData.is_driver ?? role === "driver",
          is_active: formData.is_active ?? true,
          team: formData.team || null,
          payment_method: formData.payment_method || "zelle",
          zelle_key: formData.zelle_key || null,
          quickbooks_vendor_id: formData.quickbooks_vendor_id || null,
        })
        .eq("id", id)
        .select("*, staff_roles(role)")
        .single();

      if (error) throw error;

      // Persist role to staff_roles (source of truth)
      const { error: roleError } = await supabase
        .from("staff_roles")
        .upsert([{ staff_id: id, role }], { onConflict: "staff_id" });

      if (roleError) throw roleError;

      const normalized: any = {
        ...data,
        staff_roles: Array.isArray((data as any).staff_roles)
          ? ((data as any).staff_roles[0] ?? null)
          : ((data as any).staff_roles ?? null),
      };

      return normalized;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["staff", "cleaners-drivers"] });
      toast.success("Staff member updated successfully!");
    },
    onError: (error) => {
      console.error("Error updating staff member:", error);
      toast.error("Failed to update staff member");
    },
  });
}

// Delete a staff member
export function useDeleteStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("staff").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["staff", "cleaners-drivers"] });
      toast.success("Staff member deleted successfully!");
    },
    onError: (error) => {
      console.error("Error deleting staff member:", error);
      toast.error("Failed to delete staff member");
    },
  });
}
