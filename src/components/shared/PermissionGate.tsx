import { ReactNode } from "react";
import { usePermission } from "@/hooks/usePermission";

// ============================================
// PERMISSION GATE COMPONENT
// Conditionally render children based on permissions
// ============================================

interface PermissionGateProps {
  /** Single permission ID to check */
  permission?: string;
  
  /** Multiple permissions - requires ALL by default */
  permissions?: string[];
  
  /** If true, requires only ONE of the permissions (OR logic) */
  requireAny?: boolean;
  
  /** Module name for quick CRUD checks */
  module?: string;
  
  /** Action type for module-based checks */
  action?: "view" | "create" | "edit" | "delete" | "toggle";
  
  /** Content to show if user has permission */
  children: ReactNode;
  
  /** Content to show if user lacks permission (optional) */
  fallback?: ReactNode;
  
  /** If true, shows nothing instead of fallback when no permission */
  hideOnly?: boolean;
}

export function PermissionGate({
  permission,
  permissions,
  requireAny = false,
  module,
  action,
  children,
  fallback = null,
  hideOnly = false,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission();
  
  let hasAccess = false;
  
  // Check single permission
  if (permission) {
    hasAccess = hasPermission(permission);
  }
  // Check multiple permissions
  else if (permissions && permissions.length > 0) {
    hasAccess = requireAny 
      ? hasAnyPermission(permissions) 
      : hasAllPermissions(permissions);
  }
  // Check module + action combination
  else if (module && action) {
    const permissionId = `${action}_${module}`;
    hasAccess = hasPermission(permissionId);
  }
  // No permission specified = allow (developer error)
  else {
    console.warn("PermissionGate: No permission, permissions, or module+action specified");
    hasAccess = true;
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (hideOnly) {
    return null;
  }

  return <>{fallback}</>;
}

// ============================================
// SPECIALIZED GATES
// ============================================

interface ModuleGateProps {
  module: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/** Gate for viewing a module */
export function ViewGate({ module, children, fallback }: ModuleGateProps) {
  return (
    <PermissionGate module={module} action="view" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

/** Gate for creating in a module */
export function CreateGate({ module, children, fallback }: ModuleGateProps) {
  return (
    <PermissionGate module={module} action="create" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

/** Gate for editing in a module */
export function EditGate({ module, children, fallback }: ModuleGateProps) {
  return (
    <PermissionGate module={module} action="edit" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

/** Gate for deleting in a module */
export function DeleteGate({ module, children, fallback }: ModuleGateProps) {
  return (
    <PermissionGate module={module} action="delete" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

/** Gate for toggling status in a module */
export function ToggleGate({ module, children, fallback }: ModuleGateProps) {
  return (
    <PermissionGate module={module} action="toggle" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

// ============================================
// ADMIN ONLY GATE
// ============================================

interface AdminGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AdminGate({ children, fallback }: AdminGateProps) {
  const { isAdmin } = usePermission();
  
  if (isAdmin()) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}
