import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Enums } from "@/integrations/supabase/types";
import { DEFAULT_ROLES, usePermissionsStore } from "@/stores/permissions.store";
import type { Role } from "@/stores/types";

interface GuardProps {
  children: ReactNode;
  allowUnconfigured?: boolean;
  allowedRoles?: readonly AppRole[];
}

type AppRole = Enums<"app_role">;
type StaffIdentity = { id: string; role: AppRole };

function withCrmContactPermissions(permissions: string[]): string[] {
  if (permissions.includes("*")) return permissions;

  const contactPermissions = [
    permissions.includes("customers.view") ? "contacts.view" : null,
    permissions.includes("customers.create") ? "contacts.create" : null,
    permissions.includes("customers.edit") ? "contacts.edit" : null,
    permissions.includes("customers.delete") ? "contacts.delete" : null,
  ].filter((permission): permission is string => Boolean(permission));

  return Array.from(new Set([...permissions, ...contactPermissions]));
}

function roleForAppRole(appRole: AppRole): Role {
  const admin = DEFAULT_ROLES.find((role) => role.id === "admin")!;
  const manager = DEFAULT_ROLES.find((role) => role.id === "manager")!;
  const finance = DEFAULT_ROLES.find((role) => role.id === "finance")!;
  const staff = DEFAULT_ROLES.find((role) => role.id === "staff")!;

  const template = appRole === "admin"
    ? admin
    : appRole === "office_manager"
      ? { ...manager, permissions: Array.from(new Set([...manager.permissions, ...finance.permissions])) }
      : ["cleaning_manager", "virtual_assistant"].includes(appRole)
        ? manager
        : staff;

  return {
    ...template,
    id: appRole,
    name: appRole.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
    company_id: "single-company",
    permissions: withCrmContactPermissions(template.permissions),
  };
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading session" />
    </div>
  );
}

function useSupabaseSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { session, isLoading };
}

export function AuthenticatedRoute({ children, allowUnconfigured = false, allowedRoles }: GuardProps) {
  const { session, isLoading } = useSupabaseSession();
  const location = useLocation();
  const setCurrentRole = usePermissionsStore((state) => state.setCurrentRole);
  const [staffIdentity, setStaffIdentity] = useState<StaffIdentity | null>(null);
  const [isIdentityLoading, setIsIdentityLoading] = useState(true);

  useEffect(() => {
    if (!session?.user.email) {
      setStaffIdentity(null);
      setCurrentRole(null);
      setIsIdentityLoading(false);
      return;
    }

    let active = true;
    setIsIdentityLoading(true);
    void supabase.rpc("current_staff_id").then(async ({ data: staffId }) => {
      if (!staffId) return { data: null };
      const result = await supabase
        .from("staff")
        .select("id, staff_roles(role)")
        .eq("id", staffId)
        .eq("is_active", true)
        .maybeSingle();
      return { data: result.data };
    }).then(({ data }) => {
        if (!active) return;
        const roleJoin = data?.staff_roles;
        const role = (Array.isArray(roleJoin) ? roleJoin[0]?.role : roleJoin?.role) as AppRole | undefined;
        const identity = data && role ? { id: data.id, role } : null;
        setStaffIdentity(identity);
        setCurrentRole(identity ? roleForAppRole(identity.role) : null);
        setIsIdentityLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session?.user.email, setCurrentRole]);

  if (isLoading || (session && isIdentityLoading)) return <LoadingScreen />;
  if (!session) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }
  if (!staffIdentity && !allowUnconfigured) {
    return <Navigate to="/setup" replace />;
  }
  if (staffIdentity && allowUnconfigured) {
    return <Navigate to="/" replace />;
  }
  if (staffIdentity && allowedRoles && !allowedRoles.includes(staffIdentity.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export function PlatformAdminRoute({ children }: GuardProps) {
  const { session, isLoading: isSessionLoading } = useSupabaseSession();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session?.user.id) {
      setIsAdmin(false);
      return;
    }

    let active = true;
    void supabase
      .rpc("is_platform_admin", { _user_id: session.user.id })
      .then(({ data, error }) => {
        if (!active) return;
        setIsAdmin(!error && data === true);
      });

    return () => {
      active = false;
    };
  }, [session?.user.id]);

  if (isSessionLoading || (session && isAdmin === null)) return <LoadingScreen />;
  if (!session || !isAdmin) return <Navigate to="/admin/auth" replace />;

  return children;
}
