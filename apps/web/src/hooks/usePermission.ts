import { useCallback } from "react";
import { usePermissionsStore } from "@/stores/permissions.store";

const normalizePermission = (permission: string): string => {
  if (permission.includes(".")) return permission;

  const [action, ...moduleParts] = permission.split("_");
  const module = moduleParts.join("_");
  if (!module) return permission;

  const actionMap: Record<string, string> = {
    view: "view",
    create: "create",
    edit: "edit",
    delete: "delete",
    toggle: "toggle",
  };

  return actionMap[action] ? `${module}.${actionMap[action]}` : permission;
};

export function usePermission() {
  const currentRole = usePermissionsStore((state) => state.currentRole);
  const storeHasPermission = usePermissionsStore((state) => state.hasPermission);

  const hasPermission = useCallback(
    (permission: string) => storeHasPermission(normalizePermission(permission)),
    [storeHasPermission],
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]) => permissions.some(hasPermission),
    [hasPermission],
  );

  const hasAllPermissions = useCallback(
    (permissions: string[]) => permissions.every(hasPermission),
    [hasPermission],
  );

  const canView = useCallback(
    (module: string) => hasPermission(`${module}.view`),
    [hasPermission],
  );
  const canCreate = useCallback(
    (module: string) => hasPermission(`${module}.create`),
    [hasPermission],
  );
  const canEdit = useCallback(
    (module: string) => hasPermission(`${module}.edit`),
    [hasPermission],
  );
  const canDelete = useCallback(
    (module: string) => hasPermission(`${module}.delete`),
    [hasPermission],
  );
  const canToggle = useCallback(
    (module: string) => hasPermission(`${module.replace(/^toggle_/, "")}.toggle`),
    [hasPermission],
  );

  const isAdmin = useCallback(
    () => Boolean(currentRole?.permissions.includes("*") || currentRole?.name.toLowerCase() === "admin"),
    [currentRole],
  );

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canToggle,
    getScheduleVisibility: () => "own",
    isAdmin,
    userRole: currentRole?.name ?? "unauthorized",
    userPermissions: currentRole?.permissions ?? [],
  };
}

export type UsePermissionReturn = ReturnType<typeof usePermission>;
