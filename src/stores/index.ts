// ============================================
// STORES INDEX - Central Export
// ============================================

// Types
export * from "./types";

// Session Store
export { 
  useSessionStore,
  useCurrentUser,
  useActiveCompany,
  useIsAuthenticated,
  useCompanyId,
} from "./session.store";

// Permissions Store
export {
  usePermissionsStore,
  useCurrentRole,
  useRoles,
  useHasPermission,
  useIsAdmin,
  PERMISSION_CATEGORIES,
  ALL_PERMISSIONS,
  DEFAULT_ROLES,
  getPermissionByKey,
} from "./permissions.store";

// Profile Store
export {
  useProfileStore,
  useProfile,
  useProfileLoading,
  useProfileDirty,
} from "./profile.store";

// Company Store
export {
  useCompanyStore,
  useCompany,
  useBusinessHours,
  useCompanyLoading,
  useCompanyDirty,
  COUNTRY_OPTIONS,
  TIMEZONE_OPTIONS,
  DATE_FORMAT_OPTIONS,
  CURRENCY_OPTIONS,
} from "./company.store";

// Notification Store
export {
  useNotificationStore,
  useNotificationPreferences,
  useNotificationLoading,
  useNotificationDirty,
  useEventPreference,
  useCategoryPreferences,
  NOTIFICATION_EVENTS,
  NOTIFICATION_CATEGORIES,
} from "./notification.store";

// Billing Store
export {
  useBillingStore,
  useBilling,
  useInvoices,
  usePaymentMethods,
  useCurrentPlan,
  useBillingLoading,
  PLAN_FEATURES,
  PLAN_PRICES,
} from "./billing.store";

// Team Store
export {
  useTeamStore,
  useTeamMembers,
  useTeamLoading,
  useActiveTeamMembers,
  STATUS_CONFIG,
} from "./team.store";

// Security Store
export {
  useSecurityStore,
  useSecuritySettings,
  useSessions,
  useAuditLogs,
  useTwoFactorEnabled,
  useSecurityLoading,
  AUDIT_ACTION_LABELS,
  DEVICE_TYPE_CONFIG,
} from "./security.store";
