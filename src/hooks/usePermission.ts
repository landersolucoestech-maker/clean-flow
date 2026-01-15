import { useMemo, useCallback } from "react";

// ============================================
// PERMISSION HOOK - Check user permissions
// ============================================

// Mock user permissions - Replace with actual auth context
// In production, this would come from:
// 1. Supabase user_roles table
// 2. Auth context/provider
// 3. JWT claims

interface UserPermissions {
  permissions: string[];
  scheduleVisibility: string;
  role: string;
}

// Temporary mock - Replace with actual implementation
const getMockUserPermissions = (): UserPermissions => {
  // This should be replaced with actual auth logic
  // For now, returning admin permissions for development
  return {
    role: "admin",
    permissions: [], // Empty = check all, or specific permissions
    scheduleVisibility: "all_days",
  };
};

// ============================================
// MAIN HOOK
// ============================================

export function usePermission() {
  // In production, get from auth context
  const userPermissions = useMemo(() => getMockUserPermissions(), []);
  
  /**
   * Check if user has a specific permission
   * @param permission - Permission ID to check (e.g., "view_customers")
   * @returns boolean
   */
  const hasPermission = useCallback((permission: string): boolean => {
    // Admin bypass - has all permissions
    if (userPermissions.role === "admin") {
      return true;
    }
    
    return userPermissions.permissions.includes(permission);
  }, [userPermissions]);

  /**
   * Check if user has ANY of the specified permissions
   * @param permissions - Array of permission IDs
   * @returns boolean
   */
  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    if (userPermissions.role === "admin") {
      return true;
    }
    
    return permissions.some(p => userPermissions.permissions.includes(p));
  }, [userPermissions]);

  /**
   * Check if user has ALL of the specified permissions
   * @param permissions - Array of permission IDs
   * @returns boolean
   */
  const hasAllPermissions = useCallback((permissions: string[]): boolean => {
    if (userPermissions.role === "admin") {
      return true;
    }
    
    return permissions.every(p => userPermissions.permissions.includes(p));
  }, [userPermissions]);

  /**
   * Check if user can view a module
   * @param module - Module name (schedule, customers, invoices, etc.)
   * @returns boolean
   */
  const canView = useCallback((module: string): boolean => {
    return hasPermission(`view_${module}`);
  }, [hasPermission]);

  /**
   * Check if user can create in a module
   * @param module - Module name
   * @returns boolean
   */
  const canCreate = useCallback((module: string): boolean => {
    return hasPermission(`create_${module}`);
  }, [hasPermission]);

  /**
   * Check if user can edit in a module
   * @param module - Module name
   * @returns boolean
   */
  const canEdit = useCallback((module: string): boolean => {
    return hasPermission(`edit_${module}`);
  }, [hasPermission]);

  /**
   * Check if user can delete in a module
   * @param module - Module name
   * @returns boolean
   */
  const canDelete = useCallback((module: string): boolean => {
    return hasPermission(`delete_${module}`);
  }, [hasPermission]);

  /**
   * Check if user can toggle status in a module
   * @param module - Module name or specific toggle permission
   * @returns boolean
   */
  const canToggle = useCallback((module: string): boolean => {
    // Handle both "invoice_status" and "toggle_invoice_status"
    const permissionId = module.startsWith("toggle_") ? module : `toggle_${module}`;
    return hasPermission(permissionId);
  }, [hasPermission]);

  /**
   * Get schedule visibility setting
   * @returns Visibility level
   */
  const getScheduleVisibility = useCallback((): string => {
    return userPermissions.scheduleVisibility;
  }, [userPermissions]);

  /**
   * Check if user is admin
   * @returns boolean
   */
  const isAdmin = useCallback((): boolean => {
    return userPermissions.role === "admin";
  }, [userPermissions]);

  return {
    // Core checks
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // CRUD shortcuts
    canView,
    canCreate,
    canEdit,
    canDelete,
    canToggle,
    
    // Special checks
    getScheduleVisibility,
    isAdmin,
    
    // Raw data
    userRole: userPermissions.role,
    userPermissions: userPermissions.permissions,
  };
}

// ============================================
// TYPE EXPORTS
// ============================================

export type UsePermissionReturn = ReturnType<typeof usePermission>;
