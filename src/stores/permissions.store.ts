import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role, Permission, PermissionCategory } from "./types";

// ============================================
// HIERARCHICAL PERMISSION CATEGORIES
// Format: module.action.scope
// ============================================

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: "schedule",
    module: "schedule",
    label: "Agenda / Schedule",
    description: "Controle de acesso à agenda e agendamentos",
    permissions: [
      { id: "schedule_view_own", key: "schedule.view.own", label: "Ver própria agenda", description: "Ver apenas seus próprios agendamentos", module: "schedule", action: "view", scope: "own" },
      { id: "schedule_view_team", key: "schedule.view.team", label: "Ver agenda da equipe", description: "Ver agendamentos da equipe", module: "schedule", action: "view", scope: "team" },
      { id: "schedule_view_all", key: "schedule.view.all", label: "Ver toda agenda", description: "Ver todos os agendamentos", module: "schedule", action: "view", scope: "all" },
      { id: "schedule_create", key: "schedule.create", label: "Criar agendamentos", description: "Criar novos agendamentos", module: "schedule", action: "create" },
      { id: "schedule_edit", key: "schedule.edit", label: "Editar agendamentos", description: "Editar agendamentos existentes", module: "schedule", action: "edit" },
      { id: "schedule_delete", key: "schedule.delete", label: "Excluir agendamentos", description: "Excluir agendamentos", module: "schedule", action: "delete" },
      { id: "schedule_toggle", key: "schedule.toggle", label: "Alterar status", description: "Alterar status de agendamentos", module: "schedule", action: "toggle" },
    ],
  },
  {
    id: "customers",
    module: "customers",
    label: "Clientes / Customers",
    description: "Controle de acesso a clientes",
    permissions: [
      { id: "customers_view", key: "customers.view", label: "Ver clientes", description: "Ver lista de clientes", module: "customers", action: "view" },
      { id: "customers_view_contact", key: "customers.view.contact", label: "Ver contatos", description: "Ver informações de contato", module: "customers", action: "view", scope: "own" },
      { id: "customers_create", key: "customers.create", label: "Criar clientes", description: "Criar novos clientes", module: "customers", action: "create" },
      { id: "customers_edit", key: "customers.edit", label: "Editar clientes", description: "Editar dados de clientes", module: "customers", action: "edit" },
      { id: "customers_delete", key: "customers.delete", label: "Excluir clientes", description: "Excluir clientes", module: "customers", action: "delete" },
    ],
  },
  {
    id: "jobs",
    module: "jobs",
    label: "Serviços / Jobs",
    description: "Controle de acesso a serviços e preços",
    permissions: [
      { id: "jobs_view_own", key: "jobs.view.own", label: "Ver próprios serviços", description: "Ver apenas seus próprios serviços", module: "jobs", action: "view", scope: "own" },
      { id: "jobs_view_team", key: "jobs.view.team", label: "Ver serviços da equipe", description: "Ver serviços da equipe", module: "jobs", action: "view", scope: "team" },
      { id: "jobs_view_all", key: "jobs.view.all", label: "Ver todos serviços", description: "Ver todos os serviços", module: "jobs", action: "view", scope: "all" },
      { id: "jobs_create", key: "jobs.create", label: "Criar serviços", description: "Criar novos serviços", module: "jobs", action: "create" },
      { id: "jobs_edit", key: "jobs.edit", label: "Editar serviços", description: "Editar serviços existentes", module: "jobs", action: "edit" },
      { id: "jobs_delete", key: "jobs.delete", label: "Excluir serviços", description: "Excluir serviços", module: "jobs", action: "delete" },
      { id: "jobs_prices_view", key: "jobs.prices.view", label: "Ver preços", description: "Ver preços dos serviços", module: "jobs", action: "view" },
      { id: "jobs_prices_edit", key: "jobs.prices.edit", label: "Editar preços", description: "Editar preços dos serviços", module: "jobs", action: "edit" },
      { id: "jobs_toggle", key: "jobs.toggle", label: "Alterar status", description: "Iniciar/finalizar serviços", module: "jobs", action: "toggle" },
    ],
  },
  {
    id: "accounting",
    module: "accounting",
    label: "Contabilidade / Accounting",
    description: "Controle de acesso a finanças",
    permissions: [
      { id: "accounting_view", key: "accounting.view", label: "Ver contabilidade", description: "Ver dados financeiros", module: "accounting", action: "view" },
      { id: "accounting_create", key: "accounting.create", label: "Criar lançamentos", description: "Criar lançamentos financeiros", module: "accounting", action: "create" },
      { id: "accounting_edit", key: "accounting.edit", label: "Editar lançamentos", description: "Editar lançamentos", module: "accounting", action: "edit" },
      { id: "accounting_delete", key: "accounting.delete", label: "Excluir lançamentos", description: "Excluir lançamentos", module: "accounting", action: "delete" },
    ],
  },
  {
    id: "transactions",
    module: "transactions",
    label: "Transações / Transactions",
    description: "Controle de acesso a transações",
    permissions: [
      { id: "transactions_view", key: "transactions.view", label: "Ver transações", description: "Ver lista de transações", module: "transactions", action: "view" },
      { id: "transactions_create", key: "transactions.create", label: "Criar transações", description: "Criar novas transações", module: "transactions", action: "create" },
      { id: "transactions_edit", key: "transactions.edit", label: "Editar transações", description: "Editar transações", module: "transactions", action: "edit" },
      { id: "transactions_delete", key: "transactions.delete", label: "Excluir transações", description: "Excluir transações", module: "transactions", action: "delete" },
    ],
  },
  {
    id: "invoices",
    module: "invoices",
    label: "Faturas / Invoices",
    description: "Controle de acesso a faturas",
    permissions: [
      { id: "invoices_view", key: "invoices.view", label: "Ver faturas", description: "Ver lista de faturas", module: "invoices", action: "view" },
      { id: "invoices_create", key: "invoices.create", label: "Criar faturas", description: "Criar novas faturas", module: "invoices", action: "create" },
      { id: "invoices_edit", key: "invoices.edit", label: "Editar faturas", description: "Editar faturas", module: "invoices", action: "edit" },
      { id: "invoices_delete", key: "invoices.delete", label: "Excluir faturas", description: "Excluir faturas", module: "invoices", action: "delete" },
      { id: "invoices_send", key: "invoices.send", label: "Enviar faturas", description: "Enviar faturas para clientes", module: "invoices", action: "toggle" },
    ],
  },
  {
    id: "leads",
    module: "leads",
    label: "Leads",
    description: "Controle de acesso a leads",
    permissions: [
      { id: "leads_view", key: "leads.view", label: "Ver leads", description: "Ver lista de leads", module: "leads", action: "view" },
      { id: "leads_create", key: "leads.create", label: "Criar leads", description: "Criar novos leads", module: "leads", action: "create" },
      { id: "leads_edit", key: "leads.edit", label: "Editar leads", description: "Editar leads", module: "leads", action: "edit" },
      { id: "leads_delete", key: "leads.delete", label: "Excluir leads", description: "Excluir leads", module: "leads", action: "delete" },
      { id: "leads_convert", key: "leads.convert", label: "Converter leads", description: "Converter leads em clientes", module: "leads", action: "toggle" },
    ],
  },
  {
    id: "team",
    module: "team",
    label: "Equipe / Team",
    description: "Controle de acesso à gestão de equipe",
    permissions: [
      { id: "team_view", key: "team.view", label: "Ver equipe", description: "Ver membros da equipe", module: "team", action: "view" },
      { id: "team_create", key: "team.create", label: "Adicionar membros", description: "Adicionar novos membros", module: "team", action: "create" },
      { id: "team_edit", key: "team.edit", label: "Editar membros", description: "Editar dados de membros", module: "team", action: "edit" },
      { id: "team_delete", key: "team.delete", label: "Remover membros", description: "Remover membros da equipe", module: "team", action: "delete" },
      { id: "team_invite", key: "team.invite", label: "Convidar membros", description: "Enviar convites para novos membros", module: "team", action: "toggle" },
    ],
  },
  {
    id: "payroll",
    module: "payroll",
    label: "Folha de Pagamento / Payroll",
    description: "Controle de acesso à folha de pagamento",
    permissions: [
      { id: "payroll_view", key: "payroll.view", label: "Ver folha", description: "Ver dados de pagamento", module: "payroll", action: "view" },
      { id: "payroll_create", key: "payroll.create", label: "Processar folha", description: "Processar folha de pagamento", module: "payroll", action: "create" },
      { id: "payroll_edit", key: "payroll.edit", label: "Editar folha", description: "Editar dados de pagamento", module: "payroll", action: "edit" },
      { id: "payroll_approve", key: "payroll.approve", label: "Aprovar pagamentos", description: "Aprovar pagamentos", module: "payroll", action: "toggle" },
    ],
  },
  {
    id: "reports",
    module: "reports",
    label: "Relatórios / Reports",
    description: "Controle de acesso a relatórios",
    permissions: [
      { id: "reports_view", key: "reports.view", label: "Ver relatórios", description: "Ver relatórios gerais", module: "reports", action: "view" },
      { id: "reports_financial", key: "reports.financial", label: "Relatórios financeiros", description: "Ver relatórios financeiros", module: "reports", action: "view" },
      { id: "reports_export", key: "reports.export", label: "Exportar relatórios", description: "Exportar relatórios", module: "reports", action: "toggle" },
    ],
  },
  {
    id: "settings",
    module: "settings",
    label: "Configurações / Settings",
    description: "Controle de acesso às configurações",
    permissions: [
      { id: "settings_profile_view", key: "settings.profile.view", label: "Ver perfil", description: "Ver configurações de perfil", module: "settings", action: "view" },
      { id: "settings_profile_edit", key: "settings.profile.edit", label: "Editar perfil", description: "Editar configurações de perfil", module: "settings", action: "edit" },
      { id: "settings_company_view", key: "settings.company.view", label: "Ver empresa", description: "Ver configurações da empresa", module: "settings", action: "view" },
      { id: "settings_company_edit", key: "settings.company.edit", label: "Editar empresa", description: "Editar configurações da empresa", module: "settings", action: "edit" },
      { id: "settings_billing_view", key: "settings.billing.view", label: "Ver cobrança", description: "Ver configurações de cobrança", module: "settings", action: "view" },
      { id: "settings_billing_edit", key: "settings.billing.edit", label: "Editar cobrança", description: "Editar configurações de cobrança", module: "settings", action: "edit" },
      { id: "settings_team_view", key: "settings.team.view", label: "Ver equipe", description: "Ver configurações de equipe", module: "settings", action: "view" },
      { id: "settings_team_manage", key: "settings.team.manage", label: "Gerenciar equipe", description: "Gerenciar membros da equipe", module: "settings", action: "edit" },
      { id: "settings_roles_manage", key: "settings.roles.manage", label: "Gerenciar funções", description: "Criar e editar funções", module: "settings", action: "edit" },
      { id: "settings_security_view", key: "settings.security.view", label: "Ver segurança", description: "Ver configurações de segurança", module: "settings", action: "view" },
      { id: "settings_security_edit", key: "settings.security.edit", label: "Editar segurança", description: "Editar configurações de segurança", module: "settings", action: "edit" },
      { id: "settings_notifications_view", key: "settings.notifications.view", label: "Ver notificações", description: "Ver configurações de notificações", module: "settings", action: "view" },
      { id: "settings_notifications_edit", key: "settings.notifications.edit", label: "Editar notificações", description: "Editar configurações de notificações", module: "settings", action: "edit" },
      { id: "settings_automations_view", key: "settings.automations.view", label: "Ver automações", description: "Ver configurações de automações", module: "settings", action: "view" },
      { id: "settings_automations_edit", key: "settings.automations.edit", label: "Editar automações", description: "Editar automações", module: "settings", action: "edit" },
      { id: "settings_integrations_view", key: "settings.integrations.view", label: "Ver integrações", description: "Ver integrações disponíveis", module: "settings", action: "view" },
      { id: "settings_integrations_edit", key: "settings.integrations.edit", label: "Gerenciar integrações", description: "Conectar/desconectar integrações", module: "settings", action: "edit" },
      { id: "settings_templates_view", key: "settings.templates.view", label: "Ver templates", description: "Ver templates de documentos", module: "settings", action: "view" },
      { id: "settings_templates_edit", key: "settings.templates.edit", label: "Editar templates", description: "Editar templates de documentos", module: "settings", action: "edit" },
    ],
  },
  {
    id: "communications",
    module: "communications",
    label: "Comunicações / Communications",
    description: "Controle de acesso a comunicações",
    permissions: [
      { id: "communications_view", key: "communications.view", label: "Ver mensagens", description: "Ver mensagens e chats", module: "communications", action: "view" },
      { id: "communications_send", key: "communications.send", label: "Enviar mensagens", description: "Enviar mensagens", module: "communications", action: "create" },
    ],
  },
];

// Flatten all permissions
export const ALL_PERMISSIONS = PERMISSION_CATEGORIES.flatMap((cat) => cat.permissions);

// Get permission by key
export const getPermissionByKey = (key: string): Permission | undefined => {
  return ALL_PERMISSIONS.find((p) => p.key === key);
};

// ============================================
// DEFAULT ROLE TEMPLATES
// ============================================

export const DEFAULT_ROLES: Omit<Role, "company_id">[] = [
  {
    id: "admin",
    name: "Admin",
    description: "Acesso total ao sistema",
    permissions: ["*"], // Wildcard for all permissions
    is_system: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "manager",
    name: "Manager",
    description: "Acesso operacional com restrições administrativas",
    permissions: [
      "schedule.view.all", "schedule.create", "schedule.edit", "schedule.toggle",
      "customers.view", "customers.view.contact", "customers.create", "customers.edit",
      "jobs.view.all", "jobs.create", "jobs.edit", "jobs.prices.view", "jobs.toggle",
      "leads.view", "leads.create", "leads.edit", "leads.convert",
      "team.view",
      "reports.view",
      "settings.profile.view", "settings.profile.edit",
      "settings.company.view",
      "settings.team.view",
      "settings.notifications.view", "settings.notifications.edit",
    ],
    is_system: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "staff",
    name: "Staff / Cleaner",
    description: "Acesso para execução de serviços",
    permissions: [
      "schedule.view.own", "schedule.toggle",
      "jobs.view.own", "jobs.toggle",
      "settings.profile.view", "settings.profile.edit",
    ],
    is_system: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "finance",
    name: "Finance",
    description: "Acesso a operações financeiras",
    permissions: [
      "accounting.view", "accounting.create", "accounting.edit",
      "transactions.view", "transactions.create", "transactions.edit",
      "invoices.view", "invoices.create", "invoices.edit", "invoices.send",
      "payroll.view", "payroll.create", "payroll.edit", "payroll.approve",
      "reports.view", "reports.financial", "reports.export",
      "settings.profile.view", "settings.profile.edit",
      "settings.billing.view",
    ],
    is_system: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "readonly",
    name: "Read-only",
    description: "Acesso apenas para visualização",
    permissions: [
      "schedule.view.all",
      "customers.view",
      "jobs.view.all", "jobs.prices.view",
      "leads.view",
      "reports.view",
      "settings.profile.view",
    ],
    is_system: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sales",
    name: "Sales",
    description: "Foco em leads e aquisição de clientes",
    permissions: [
      "customers.view", "customers.view.contact", "customers.create", "customers.edit",
      "leads.view", "leads.create", "leads.edit", "leads.convert",
      "schedule.view.all", "schedule.create",
      "reports.view",
      "settings.profile.view", "settings.profile.edit",
    ],
    is_system: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ============================================
// PERMISSIONS STORE
// ============================================

interface PermissionsState {
  // Current user's role
  currentRole: Role | null;
  // All roles for current company
  roles: Role[];
  // Loading state
  isLoading: boolean;

  // Actions
  setCurrentRole: (role: Role | null) => void;
  setRoles: (roles: Role[]) => void;
  addRole: (role: Role) => void;
  updateRole: (roleId: string, updates: Partial<Role>) => void;
  deleteRole: (roleId: string) => void;
  
  // Permission checks
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  canAccessModule: (module: string, action?: string, scope?: string) => boolean;
  isAdmin: () => boolean;
  
  // Utilities
  initializeRoles: (companyId: string) => void;
  setLoading: (loading: boolean) => void;
}

export const usePermissionsStore = create<PermissionsState>()(
  persist(
    (set, get) => ({
      currentRole: null,
      roles: [],
      isLoading: false,

      setCurrentRole: (role) => set({ currentRole: role }),

      setRoles: (roles) => set({ roles }),

      addRole: (role) => set((state) => ({ roles: [...state.roles, role] })),

      updateRole: (roleId, updates) =>
        set((state) => ({
          roles: state.roles.map((r) =>
            r.id === roleId ? { ...r, ...updates, updated_at: new Date().toISOString() } : r
          ),
          currentRole:
            state.currentRole?.id === roleId
              ? { ...state.currentRole, ...updates, updated_at: new Date().toISOString() }
              : state.currentRole,
        })),

      deleteRole: (roleId) =>
        set((state) => ({
          roles: state.roles.filter((r) => r.id !== roleId),
        })),

      hasPermission: (permission) => {
        const { currentRole } = get();
        if (!currentRole) return false;
        
        // Admin wildcard
        if (currentRole.permissions.includes("*")) return true;
        
        // Direct match
        if (currentRole.permissions.includes(permission)) return true;
        
        // Check for module wildcard (e.g., "jobs.*")
        const [module] = permission.split(".");
        if (currentRole.permissions.includes(`${module}.*`)) return true;
        
        return false;
      },

      hasAnyPermission: (permissions) => {
        const { hasPermission } = get();
        return permissions.some((p) => hasPermission(p));
      },

      hasAllPermissions: (permissions) => {
        const { hasPermission } = get();
        return permissions.every((p) => hasPermission(p));
      },

      canAccessModule: (module, action, scope) => {
        const { hasPermission, currentRole } = get();
        if (!currentRole) return false;
        
        // Admin bypass
        if (currentRole.permissions.includes("*")) return true;
        
        // Build permission key
        let permissionKey = module;
        if (action) permissionKey += `.${action}`;
        if (scope) permissionKey += `.${scope}`;
        
        // Check exact match
        if (hasPermission(permissionKey)) return true;
        
        // Check higher scope permissions
        if (scope === "own") {
          if (hasPermission(`${module}.${action}.team`) || hasPermission(`${module}.${action}.all`)) {
            return true;
          }
        }
        if (scope === "team") {
          if (hasPermission(`${module}.${action}.all`)) {
            return true;
          }
        }
        
        return false;
      },

      isAdmin: () => {
        const { currentRole } = get();
        return currentRole?.permissions.includes("*") || currentRole?.name.toLowerCase() === "admin";
      },

      initializeRoles: (companyId) => {
        const defaultRolesWithCompany = DEFAULT_ROLES.map((role) => ({
          ...role,
          company_id: companyId,
        }));
        set({ roles: defaultRolesWithCompany });
      },

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: "permissions-storage",
      partialize: (state) => ({
        currentRole: state.currentRole,
        roles: state.roles,
      }),
    }
  )
);

// ============================================
// SELECTORS
// ============================================

export const useCurrentRole = () => usePermissionsStore((state) => state.currentRole);
export const useRoles = () => usePermissionsStore((state) => state.roles);
export const useHasPermission = (permission: string) => 
  usePermissionsStore((state) => state.hasPermission(permission));
export const useIsAdmin = () => usePermissionsStore((state) => state.isAdmin());
