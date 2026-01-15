import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NotificationEvent, NotificationPreference, NotificationSettings } from "./types";

// ============================================
// NOTIFICATION EVENTS - Event-Based System
// ============================================

export const NOTIFICATION_EVENTS: NotificationEvent[] = [
  // Job Events
  { id: "job_created", key: "job.created", label: "Serviço Criado", description: "Quando um novo serviço é criado", category: "jobs" },
  { id: "job_assigned", key: "job.assigned", label: "Serviço Atribuído", description: "Quando um serviço é atribuído a você", category: "jobs" },
  { id: "job_started", key: "job.started", label: "Serviço Iniciado", description: "Quando um serviço é iniciado", category: "jobs" },
  { id: "job_completed", key: "job.completed", label: "Serviço Concluído", description: "Quando um serviço é concluído", category: "jobs" },
  { id: "job_canceled", key: "job.canceled", label: "Serviço Cancelado", description: "Quando um serviço é cancelado", category: "jobs" },
  { id: "job_reminder", key: "job.reminder", label: "Lembrete de Serviço", description: "Lembretes antes do serviço", category: "jobs" },
  
  // Payment Events
  { id: "payment_received", key: "payment.received", label: "Pagamento Recebido", description: "Quando um pagamento é recebido", category: "payments" },
  { id: "payment_failed", key: "payment.failed", label: "Pagamento Falhou", description: "Quando um pagamento falha", category: "payments" },
  { id: "payment_overdue", key: "payment.overdue", label: "Pagamento Atrasado", description: "Quando um pagamento está atrasado", category: "payments" },
  { id: "invoice_sent", key: "invoice.sent", label: "Fatura Enviada", description: "Quando uma fatura é enviada", category: "payments" },
  
  // Customer Events
  { id: "customer_created", key: "customer.created", label: "Novo Cliente", description: "Quando um novo cliente é criado", category: "customers" },
  { id: "review_requested", key: "review.requested", label: "Avaliação Solicitada", description: "Quando uma avaliação é solicitada", category: "customers" },
  { id: "review_received", key: "review.received", label: "Avaliação Recebida", description: "Quando uma avaliação é recebida", category: "customers" },
  
  // Lead Events
  { id: "lead_created", key: "lead.created", label: "Novo Lead", description: "Quando um novo lead é criado", category: "leads" },
  { id: "lead_converted", key: "lead.converted", label: "Lead Convertido", description: "Quando um lead é convertido em cliente", category: "leads" },
  
  // Team Events
  { id: "team_member_joined", key: "team.member_joined", label: "Membro Entrou", description: "Quando um novo membro entra na equipe", category: "team" },
  { id: "team_member_left", key: "team.member_left", label: "Membro Saiu", description: "Quando um membro sai da equipe", category: "team" },
  
  // System Events
  { id: "system_alert", key: "system.alert", label: "Alerta do Sistema", description: "Alertas importantes do sistema", category: "system" },
  { id: "system_maintenance", key: "system.maintenance", label: "Manutenção Programada", description: "Avisos de manutenção", category: "system" },
  { id: "weekly_report", key: "system.weekly_report", label: "Relatório Semanal", description: "Resumo semanal das atividades", category: "system" },
  { id: "marketing", key: "system.marketing", label: "Novidades e Promoções", description: "Atualizações do produto e ofertas", category: "system" },
];

// Group events by category
export const NOTIFICATION_CATEGORIES = [
  { id: "jobs", label: "Serviços", icon: "briefcase" },
  { id: "payments", label: "Pagamentos", icon: "credit-card" },
  { id: "customers", label: "Clientes", icon: "users" },
  { id: "leads", label: "Leads", icon: "target" },
  { id: "team", label: "Equipe", icon: "users" },
  { id: "system", label: "Sistema", icon: "settings" },
];

// ============================================
// NOTIFICATION STORE
// ============================================

interface NotificationState {
  settings: NotificationSettings | null;
  preferences: NotificationPreference[];
  isLoading: boolean;
  isDirty: boolean;

  // Actions
  setSettings: (settings: NotificationSettings | null) => void;
  setPreferences: (preferences: NotificationPreference[]) => void;
  updatePreference: (eventKey: string, channel: "email" | "sms" | "push", value: boolean) => void;
  toggleAllForEvent: (eventKey: string, enabled: boolean) => void;
  toggleAllForChannel: (channel: "email" | "sms" | "push", enabled: boolean) => void;
  saveNotifications: () => Promise<void>;
  resetNotifications: () => void;
  setLoading: (loading: boolean) => void;
}

// Default preferences - all enabled except marketing
const getDefaultPreferences = (): NotificationPreference[] => {
  return NOTIFICATION_EVENTS.map((event) => ({
    event_key: event.key,
    email: event.key !== "system.marketing",
    sms: event.category === "jobs" || event.category === "payments",
    push: event.key !== "system.marketing",
  }));
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      settings: null,
      preferences: getDefaultPreferences(),
      isLoading: false,
      isDirty: false,

      setSettings: (settings) => set({ settings }),

      setPreferences: (preferences) => set({ preferences, isDirty: false }),

      updatePreference: (eventKey, channel, value) =>
        set((state) => ({
          preferences: state.preferences.map((pref) =>
            pref.event_key === eventKey ? { ...pref, [channel]: value } : pref
          ),
          isDirty: true,
        })),

      toggleAllForEvent: (eventKey, enabled) =>
        set((state) => ({
          preferences: state.preferences.map((pref) =>
            pref.event_key === eventKey
              ? { ...pref, email: enabled, sms: enabled, push: enabled }
              : pref
          ),
          isDirty: true,
        })),

      toggleAllForChannel: (channel, enabled) =>
        set((state) => ({
          preferences: state.preferences.map((pref) => ({
            ...pref,
            [channel]: enabled,
          })),
          isDirty: true,
        })),

      saveNotifications: async () => {
        set({ isLoading: true });
        
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        set({ isLoading: false, isDirty: false });
      },

      resetNotifications: () => set({ preferences: getDefaultPreferences(), isDirty: false }),

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: "notification-storage",
      partialize: (state) => ({
        preferences: state.preferences,
      }),
    }
  )
);

// ============================================
// SELECTORS
// ============================================

export const useNotificationPreferences = () => useNotificationStore((state) => state.preferences);
export const useNotificationLoading = () => useNotificationStore((state) => state.isLoading);
export const useNotificationDirty = () => useNotificationStore((state) => state.isDirty);

// Get preference for a specific event
export const useEventPreference = (eventKey: string) =>
  useNotificationStore((state) =>
    state.preferences.find((p) => p.event_key === eventKey)
  );

// Get all preferences for a category
export const useCategoryPreferences = (category: string) =>
  useNotificationStore((state) => {
    const eventKeys = NOTIFICATION_EVENTS
      .filter((e) => e.category === category)
      .map((e) => e.key);
    return state.preferences.filter((p) => eventKeys.includes(p.event_key));
  });
