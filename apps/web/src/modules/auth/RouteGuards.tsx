import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { deriveContactPermissions } from "@/modules/crm/permissions/contactPermissions";
import { DEFAULT_ROLES, usePermissionsStore } from "@/stores/permissions.store";
import type { Role } from "@/stores/types";
import { useAuthSession } from "./hooks/useAuthSession";
import {
  getCurrentStaffIdentity,
  isPlatformAdmin,
  type AppRole,
  type StaffIdentity,
} from "./services/authService";

interface GuardProps {
  children: ReactNode;
  allowUnconfigured?: boolean;
  allowedRoles?: readonly AppRole[];
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
    permissions: deriveContactPermissions(template.permissions),
  };
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading session" />
    </div>
  );
}

export function AuthenticatedRoute({ children, allowUnconfigured = false, allowedRoles }: GuardProps) {
  const { session, isLoading } = useAuthSession();
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
    void getCurrentStaffIdentity()
      .then((identity) => {
        if (!active) return;
        setStaffIdentity(identity);
        setCurrentRole(identity ? roleForAppRole(identity.role) : null);
        setIsIdentityLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setStaffIdentity(null);
        setCurrentRole(null);
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
  const { session, isLoading: isSessionLoading } = useAuthSession();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session?.user.id) {
      setIsAdmin(false);
      return;
    }

    let active = true;
    void isPlatformAdmin(session.user.id)
      .then((allowed) => {
        if (active) setIsAdmin(allowed);
      })
      .catch(() => {
        if (active) setIsAdmin(false);
      });

    return () => {
      active = false;
    };
  }, [session?.user.id]);

  if (isSessionLoading || (session && isAdmin === null)) return <LoadingScreen />;
  if (!session || !isAdmin) return <Navigate to="/admin/auth" replace />;

  return children;
}
