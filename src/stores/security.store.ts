import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Session, SecuritySettings, AuditLog, AuditAction, DeviceType } from "./types";

// ============================================
// SECURITY STORE - Sessions, Audit, & Policies
// ============================================

interface SecurityState {
  // 2FA
  twoFactorEnabled: boolean;
  twoFactorMethod: "sms" | "authenticator";
  
  // Security Settings
  settings: SecuritySettings;
  
  // Active Sessions
  sessions: Session[];
  
  // Audit Logs
  auditLogs: AuditLog[];
  
  // Password change state
  passwordState: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  
  isLoading: boolean;
  isDirty: boolean;

  // Actions
  setTwoFactorEnabled: (enabled: boolean) => void;
  setTwoFactorMethod: (method: "sms" | "authenticator") => void;
  updateSettings: (updates: Partial<SecuritySettings>) => void;
  setSessions: (sessions: Session[]) => void;
  terminateSession: (sessionId: string) => void;
  terminateAllSessions: () => void;
  addAuditLog: (action: AuditAction, details?: string, targetType?: string, targetId?: string) => void;
  setAuditLogs: (logs: AuditLog[]) => void;
  setPasswordState: (updates: Partial<SecurityState["passwordState"]>) => void;
  resetPasswordState: () => void;
  saveSettings: () => Promise<void>;
  changePassword: () => Promise<boolean>;
  setLoading: (loading: boolean) => void;
}

const defaultSettings: SecuritySettings = {
  company_id: "company_1",
  two_factor_required: false,
  session_timeout_minutes: 30,
  password_min_length: 8,
  password_require_special: true,
  password_require_numbers: true,
  password_require_uppercase: true,
  max_login_attempts: 5,
  lockout_duration_minutes: 15,
};

const defaultSessions: Session[] = [
  {
    id: "session_1",
    user_id: "user_1",
    device_type: "desktop",
    device_name: "MacBook Pro",
    browser: "Chrome 120",
    ip_address: "192.168.1.100",
    location: "São Paulo, BR",
    is_current: true,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    last_active_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "session_2",
    user_id: "user_1",
    device_type: "mobile",
    device_name: "iPhone 15",
    browser: "Safari Mobile",
    ip_address: "192.168.1.101",
    location: "São Paulo, BR",
    is_current: false,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    last_active_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "session_3",
    user_id: "user_1",
    device_type: "tablet",
    device_name: "iPad Pro",
    browser: "Safari",
    ip_address: "10.0.0.50",
    location: "Rio de Janeiro, BR",
    is_current: false,
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    last_active_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
  },
];

const defaultAuditLogs: AuditLog[] = [
  {
    id: "log_1",
    company_id: "company_1",
    user_id: "user_1",
    user_name: "Deyvisson Lander",
    action: "login",
    ip_address: "192.168.1.100",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "log_2",
    company_id: "company_1",
    user_id: "user_1",
    user_name: "Deyvisson Lander",
    action: "settings_update",
    details: "Updated company settings",
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "log_3",
    company_id: "company_1",
    user_id: "user_1",
    user_name: "Deyvisson Lander",
    action: "role_change",
    target_type: "user",
    target_id: "user_2",
    details: "Changed role from Staff to Manager",
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "log_4",
    company_id: "company_1",
    user_id: "user_1",
    user_name: "Deyvisson Lander",
    action: "user_invite",
    target_type: "user",
    target_id: "user_3",
    details: "Invited john@cleanpro.com",
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "log_5",
    company_id: "company_1",
    user_id: "user_1",
    user_name: "Deyvisson Lander",
    action: "2fa_enable",
    details: "Enabled SMS 2FA",
    created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
  },
];

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set, get) => ({
      twoFactorEnabled: false,
      twoFactorMethod: "sms",
      settings: defaultSettings,
      sessions: defaultSessions,
      auditLogs: defaultAuditLogs,
      passwordState: {
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      },
      isLoading: false,
      isDirty: false,

      setTwoFactorEnabled: (enabled) => {
        set({ twoFactorEnabled: enabled, isDirty: true });
        // Add audit log
        get().addAuditLog(enabled ? "2fa_enable" : "2fa_disable");
      },

      setTwoFactorMethod: (method) => set({ twoFactorMethod: method, isDirty: true }),

      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
          isDirty: true,
        })),

      setSessions: (sessions) => set({ sessions }),

      terminateSession: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== sessionId),
        }));
        get().addAuditLog("session_terminate", `Terminated session ${sessionId}`);
      },

      terminateAllSessions: () => {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.is_current),
        }));
        get().addAuditLog("session_terminate", "Terminated all other sessions");
      },

      addAuditLog: (action, details, targetType, targetId) => {
        const newLog: AuditLog = {
          id: `log_${Date.now()}`,
          company_id: "company_1",
          user_id: "user_1",
          user_name: "Deyvisson Lander",
          action,
          details,
          target_type: targetType,
          target_id: targetId,
          ip_address: "192.168.1.100",
          created_at: new Date().toISOString(),
        };
        set((state) => ({
          auditLogs: [newLog, ...state.auditLogs],
        }));
      },

      setAuditLogs: (logs) => set({ auditLogs: logs }),

      setPasswordState: (updates) =>
        set((state) => ({
          passwordState: { ...state.passwordState, ...updates },
        })),

      resetPasswordState: () =>
        set({
          passwordState: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          },
        }),

      saveSettings: async () => {
        set({ isLoading: true });
        await new Promise((resolve) => setTimeout(resolve, 500));
        get().addAuditLog("settings_update", "Updated security settings");
        set({ isLoading: false, isDirty: false });
      },

      changePassword: async () => {
        const { passwordState, settings } = get();
        
        // Validation
        if (!passwordState.currentPassword || !passwordState.newPassword || !passwordState.confirmPassword) {
          return false;
        }
        
        if (passwordState.newPassword !== passwordState.confirmPassword) {
          return false;
        }
        
        if (passwordState.newPassword.length < settings.password_min_length) {
          return false;
        }
        
        set({ isLoading: true });
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        get().addAuditLog("password_change");
        get().resetPasswordState();
        
        set({ isLoading: false });
        return true;
      },

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: "security-storage",
      partialize: (state) => ({
        twoFactorEnabled: state.twoFactorEnabled,
        twoFactorMethod: state.twoFactorMethod,
        settings: state.settings,
      }),
    }
  )
);

// ============================================
// AUDIT ACTION LABELS
// ============================================

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  login: "Login",
  logout: "Logout",
  password_change: "Senha Alterada",
  role_change: "Função Alterada",
  permission_change: "Permissão Alterada",
  user_invite: "Usuário Convidado",
  user_suspend: "Usuário Suspenso",
  user_activate: "Usuário Ativado",
  settings_update: "Configurações Atualizadas",
  "2fa_enable": "2FA Ativado",
  "2fa_disable": "2FA Desativado",
  session_terminate: "Sessão Encerrada",
};

// ============================================
// DEVICE TYPE ICONS
// ============================================

export const DEVICE_TYPE_CONFIG: Record<DeviceType, { label: string; icon: string }> = {
  desktop: { label: "Desktop", icon: "monitor" },
  mobile: { label: "Mobile", icon: "smartphone" },
  tablet: { label: "Tablet", icon: "tablet" },
  unknown: { label: "Desconhecido", icon: "help-circle" },
};

// ============================================
// SELECTORS
// ============================================

export const useSecuritySettings = () => useSecurityStore((state) => state.settings);
export const useSessions = () => useSecurityStore((state) => state.sessions);
export const useAuditLogs = () => useSecurityStore((state) => state.auditLogs);
export const useTwoFactorEnabled = () => useSecurityStore((state) => state.twoFactorEnabled);
export const useSecurityLoading = () => useSecurityStore((state) => state.isLoading);
