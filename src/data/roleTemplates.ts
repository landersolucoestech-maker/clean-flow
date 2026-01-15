// ============================================
// ROLE TEMPLATES - Predefined permission sets
// ============================================

import { allPermissions } from "./permissions";

export interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  scheduleVisibility: string;
  isDefault?: boolean;
}

// Helper to get all permission IDs
const getAllPermissionIds = () => allPermissions.map(p => p.id);

// ============================================
// ADMIN - Full access to everything
// ============================================
export const adminRole: RoleTemplate = {
  id: "admin",
  name: "Admin",
  description: "Acesso total ao sistema. Pode gerenciar usuários, configurações e todos os módulos.",
  permissions: getAllPermissionIds(),
  scheduleVisibility: "all_days",
  isDefault: true,
};

// ============================================
// MANAGER - Full operational access, limited admin
// ============================================
export const managerRole: RoleTemplate = {
  id: "manager",
  name: "Manager",
  description: "Gerencia operações diárias, equipes e clientes. Sem acesso a configurações críticas.",
  permissions: [
    // Schedule - Full
    "view_schedule", "create_schedule", "edit_schedule", "delete_schedule",
    "toggle_schedule_visibility", "toggle_job_status",
    "view_other_teams_jobs", "view_all_teams",
    
    // Customers - Full
    "view_customers", "create_customers", "edit_customers", "delete_customers",
    "view_customer_contact", "view_customer_charges", "view_customer_history", "view_customer_reviews",
    
    // Communications - Full
    "view_communications", "create_messages", "delete_messages", "toggle_conversation_status",
    
    // Prices & Payments - Full
    "view_job_prices", "edit_job_prices", "view_job_payments", "edit_job_payments", "toggle_hidden_notes",
    
    // Accounting - View + Create/Edit
    "view_transactions", "create_transactions", "edit_transactions", "toggle_transaction_status",
    
    // Invoices - Full
    "view_invoices", "create_invoices", "edit_invoices", "delete_invoices", "toggle_invoice_status",
    
    // Leads - Full
    "view_leads", "create_leads", "edit_leads", "delete_leads", "toggle_lead_status",
    
    // Users - View only (no create/edit/delete)
    "view_users", "view_user_roles",
    
    // Payroll - View + Status
    "view_payroll", "toggle_payroll_status", "view_payroll_rules",
    
    // Reports - Full
    "view_reports", "view_financial_reports", "view_team_reports", "export_reports",
    
    // Settings - View only
    "view_system_settings", "view_company_settings", "view_integrations",
  ],
  scheduleVisibility: "all_days",
};

// ============================================
// STAFF / CLEANER - Field worker access
// ============================================
export const staffRole: RoleTemplate = {
  id: "staff",
  name: "Staff / Cleaner",
  description: "Acesso para execução de jobs. Visualiza agenda e atualiza status de trabalhos.",
  permissions: [
    // Schedule - View + Toggle status
    "view_schedule", "toggle_job_status",
    
    // Customers - Limited view
    "view_customers", "view_customer_contact",
    
    // Communications - Send only
    "view_communications", "create_messages",
    
    // Prices - View only
    "view_job_prices", "view_job_payments",
  ],
  scheduleVisibility: "today_tomorrow_6pm",
};

// ============================================
// FINANCE - Financial operations only
// ============================================
export const financeRole: RoleTemplate = {
  id: "finance",
  name: "Finance",
  description: "Gerencia finanças, transações, faturas e folha de pagamento.",
  permissions: [
    // Schedule - View only (to understand jobs)
    "view_schedule",
    
    // Customers - Charges view
    "view_customers", "view_customer_charges",
    
    // Prices & Payments - Full
    "view_job_prices", "edit_job_prices", "view_job_payments", "edit_job_payments",
    
    // Accounting - Full
    "view_transactions", "create_transactions", "edit_transactions", "delete_transactions", "toggle_transaction_status",
    
    // Invoices - Full
    "view_invoices", "create_invoices", "edit_invoices", "delete_invoices", "toggle_invoice_status",
    
    // Leads - View only
    "view_leads",
    
    // Payroll - Full
    "view_payroll", "create_payroll", "edit_payroll", "delete_payroll", 
    "toggle_payroll_status", "view_payroll_rules", "edit_payroll_rules",
    
    // Reports - Financial focus
    "view_reports", "view_financial_reports", "export_reports",
    
    // Settings - Billing only
    "view_billing_settings", "edit_billing_settings", "toggle_billing_status",
  ],
  scheduleVisibility: "all_days",
};

// ============================================
// READ-ONLY - View everything, edit nothing
// ============================================
export const readOnlyRole: RoleTemplate = {
  id: "readonly",
  name: "Read-Only",
  description: "Apenas visualização. Ideal para auditoria ou supervisão externa.",
  permissions: [
    "view_schedule",
    "view_customers", "view_customer_contact", "view_customer_charges", 
    "view_customer_history", "view_customer_reviews",
    "view_communications",
    "view_job_prices", "view_job_payments",
    "view_transactions",
    "view_invoices",
    "view_leads",
    "view_users", "view_user_roles",
    "view_payroll", "view_payroll_rules",
    "view_reports", "view_financial_reports", "view_team_reports",
    "view_system_settings", "view_company_settings", "view_billing_settings", "view_integrations",
  ],
  scheduleVisibility: "all_days",
};

// ============================================
// SALES - Customer acquisition focus
// ============================================
export const salesRole: RoleTemplate = {
  id: "sales",
  name: "Sales",
  description: "Foco em leads, orçamentos e conversão de clientes.",
  permissions: [
    // Schedule - View only
    "view_schedule",
    
    // Customers - Full
    "view_customers", "create_customers", "edit_customers",
    "view_customer_contact", "view_customer_history", "view_customer_reviews",
    
    // Communications - Full
    "view_communications", "create_messages", "toggle_conversation_status",
    
    // Prices - View
    "view_job_prices", "view_job_payments",
    
    // Leads - Full
    "view_leads", "create_leads", "edit_leads", "toggle_lead_status",
    
    // Invoices - Create (for estimates)
    "view_invoices", "create_invoices",
    
    // Reports - Limited
    "view_reports",
  ],
  scheduleVisibility: "current_week",
};

// ============================================
// EXPORTS
// ============================================

export const roleTemplates: RoleTemplate[] = [
  adminRole,
  managerRole,
  staffRole,
  financeRole,
  salesRole,
  readOnlyRole,
];

export const getRoleTemplate = (roleId: string): RoleTemplate | undefined => {
  return roleTemplates.find(r => r.id === roleId);
};

export const getDefaultRole = (): RoleTemplate => {
  return roleTemplates.find(r => r.isDefault) || readOnlyRole;
};
