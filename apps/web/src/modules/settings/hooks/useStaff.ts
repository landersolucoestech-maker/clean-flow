import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Enums } from "@/integrations/supabase/types";
import { toast } from "sonner";

type AppRole = Enums<"app_role">;
type StaffRoleJoin = { role: AppRole } | Array<{ role: AppRole }> | null;
type StaffQueryRow = Omit<Staff, "staff_roles"> & { staff_roles: StaffRoleJoin };

export interface Staff {
  id: string;
  auth_user_id: string | null;
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

const normalizeStaff = (staff: StaffQueryRow): Staff => ({
  ...staff,
  staff_roles: Array.isArray(staff.staff_roles)
    ? (staff.staff_roles[0] ?? null)
    : staff.staff_roles,
});

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

      const normalized = (data as StaffQueryRow[] | null)?.map(normalizeStaff) ?? [];

      return normalized as Staff[];
    },
  });
}

// Resolve the authenticated account to an active staff record. Staff email is
// the current schema's identity link until a dedicated auth user ID is added.
export function useCurrentStaff() {
  return useQuery({
    queryKey: ["staff", "current"],
    queryFn: async () => {
      const { data: staffId, error: identityError } = await supabase.rpc("current_staff_id");
      if (identityError) throw identityError;
      if (!staffId) return null;

      const { data, error } = await supabase
        .from("staff")
        .select("*, staff_roles(role)")
        .eq("id", staffId)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data ? normalizeStaff(data as StaffQueryRow) : null;
    },
    staleTime: 5 * 60 * 1000,
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

      const normalized = (data as StaffQueryRow[] | null)?.map(normalizeStaff) ?? [];

      const allowedRoles = new Set<AppRole>(["cleaner", "driver"]);

      return normalized
        .map((s) => {
          const roleFromDb = s.staff_roles?.role as AppRole | undefined;
          const role: AppRole | undefined = roleFromDb ?? (s.is_driver ? "driver" : undefined);

          return {
            ...s,
            role: role ?? "cleaner",
            // Driver icon should reflect role
            is_driver: role === "driver",
          };
        })
        .filter((s) => allowedRoles.has(s.role));
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
      const { data, error } = await supabase.functions.invoke("manage-staff", {
        body: { action: "invite", ...formData, role },
      });
      if (error || !data?.staff) throw error || new Error("Staff invitation failed");
      return normalizeStaff(data.staff as StaffQueryRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["staff", "cleaners-drivers"] });
      toast.success("Staff member invited successfully!");
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

      const { data, error } = await supabase.functions.invoke("manage-staff", {
        body: { action: "update", id, ...formData, role },
      });
      if (error || !data?.staff) throw error || new Error("Staff update failed");
      return normalizeStaff(data.staff as StaffQueryRow);
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
      const { error } = await supabase.functions.invoke("manage-staff", {
        body: { action: "delete", id },
      });
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
