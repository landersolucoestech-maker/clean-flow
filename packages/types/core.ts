// ============================================
// CORE TYPE DEFINITIONS - Multi-Tenant SaaS
// ============================================

// User Status Types
export type UserStatus = "invited" | "active" | "suspended" | "locked" | "terminated";

// Plan Types
export type PlanType = "free" | "starter" | "professional" | "enterprise";

// Billing Cycle
export type BillingCycle = "monthly" | "yearly";

// Billing Status
export type BillingStatus = "active" | "past_due" | "canceled" | "trialing";

// Invoice Status
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "canceled";

// Payment Method Types
export type PaymentMethodType = "credit_card" | "debit_card" | "bank_account" | "pix";

// Session Device Types
export type DeviceType = "desktop" | "mobile" | "tablet" | "unknown";

// Audit Action Types
export type AuditAction = 
  | "login"
  | "logout"
  | "password_change"
  | "role_change"
  | "permission_change"
  | "user_invite"
  | "user_suspend"
  | "user_activate"
  | "settings_update"
  | "2fa_enable"
  | "2fa_disable"
  | "session_terminate";

// ============================================
// USER & PROFILE TYPES
// ============================================

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile extends User {
  preferred_language: string;
  preferred_theme: "light" | "dark" | "system";
}

// ============================================
// COMPANY & MULTI-TENANT TYPES
// ============================================

export interface Company {
  id: string;
  legal_name: string;
  trade_name: string;
  tax_id?: string;
  country: string;
  currency: string;
  timezone: string;
  locale: string;
  date_format: string;
  email: string;
  phone?: string;
  address?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyUser {
  id: string;
  user_id: string;
  company_id: string;
  role_id: string;
  status: UserStatus;
  invited_at?: string;
  joined_at?: string;
  suspended_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessHours {
  day: string;
  open: string;
  close: string;
  isOpen: boolean;
}

// ============================================
// PERMISSION TYPES - Hierarchical RBAC
// ============================================

// Permission format: module.action.scope
// Examples: jobs.view.own, jobs.view.team, jobs.view.all
export interface Permission {
  id: string;
  key: string; // module.action.scope format
  label: string;
  description: string;
  module: string;
  action: string;
  scope?: "own" | "team" | "all";
}

export interface PermissionCategory {
  id: string;
  module: string;
  label: string;
  description: string;
  permissions: Permission[];
}

export interface Role {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  permissions: string[]; // Array of permission keys
  is_system: boolean; // Cannot be deleted if true
  created_at: string;
  updated_at: string;
}

// ============================================
// TEAM MEMBER TYPES
// ============================================

export interface TeamMember {
  id: string;
  user_id: string;
  company_id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  role_id: string;
  role_name: string;
  status: UserStatus;
  invited_by?: string;
  invited_at?: string;
  joined_at?: string;
  suspended_at?: string;
  last_active_at?: string;
}

// ============================================
// BILLING TYPES
// ============================================

export interface CompanyBilling {
  id: string;
  company_id: string;
  plan: PlanType;
  seats: number;
  seats_used: number;
  billing_cycle: BillingCycle;
  status: BillingStatus;
  trial_ends_at?: string;
  next_charge_date?: string;
  amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface BillingInvoice {
  id: string;
  company_id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  due_date: string;
  paid_at?: string;
  pdf_url?: string;
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  company_id: string;
  type: PaymentMethodType;
  last4: string;
  expiry_date?: string;
  bank_name?: string;
  is_default: boolean;
  created_at: string;
}

// ============================================
// NOTIFICATION TYPES - Event-Based
// ============================================

export type NotificationChannel = "email" | "sms" | "push";

export interface NotificationEvent {
  id: string;
  key: string;
  label: string;
  description: string;
  category: string;
}

export interface NotificationPreference {
  event_key: string;
  email: boolean;
  sms: boolean;
  push: boolean;
}

export interface NotificationSettings {
  company_id: string;
  user_id: string;
  preferences: NotificationPreference[];
}

// ============================================
// SECURITY TYPES
// ============================================

export interface Session {
  id: string;
  user_id: string;
  device_type: DeviceType;
  device_name: string;
  browser: string;
  ip_address: string;
  location?: string;
  is_current: boolean;
  created_at: string;
  last_active_at: string;
  expires_at: string;
}

export interface SecuritySettings {
  company_id: string;
  two_factor_required: boolean;
  session_timeout_minutes: number;
  password_min_length: number;
  password_require_special: boolean;
  password_require_numbers: boolean;
  password_require_uppercase: boolean;
  max_login_attempts: number;
  lockout_duration_minutes: number;
}

export interface AuditLog {
  id: string;
  company_id: string;
  user_id: string;
  user_name: string;
  action: AuditAction;
  target_type?: string;
  target_id?: string;
  details?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// ============================================
// SETTINGS TAB PERMISSIONS
// ============================================

export const SETTINGS_TAB_PERMISSIONS = {
  profile: "settings.profile.view",
  company: "settings.company.view",
  notifications: "settings.notifications.view",
  billing: "settings.billing.view",
  team: "settings.team.view",
  roles: "settings.roles.manage",
  security: "settings.security.view",
  automations: "settings.automations.view",
  integrations: "settings.integrations.view",
  templates: "settings.templates.view",
} as const;

export type SettingsTab = keyof typeof SETTINGS_TAB_PERMISSIONS;
