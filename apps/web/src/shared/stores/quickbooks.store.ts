import { create } from "zustand";
import { persist } from "zustand/middleware";

interface QuickBooksSettings {
  autoSyncInvoices: boolean;
  autoSyncCustomers: boolean;
  autoSyncPayroll: boolean;
  syncFrequency: "manual" | "hourly" | "daily";
  defaultPaymentTerms: string;
  invoicePrefix: string;
  defaultTaxRate: number;
  notifyOnPayment: boolean;
  notifyOnOverdue: boolean;
}

interface QuickBooksSyncLog {
  id: string;
  type: "invoice" | "customer" | "payment" | "payroll";
  action: "create" | "update" | "sync" | "send";
  status: "success" | "error" | "pending";
  message: string;
  timestamp: Date;
  localId?: string;
  qbId?: string;
}

interface QuickBooksState {
  settings: QuickBooksSettings;
  syncLogs: QuickBooksSyncLog[];
  lastSyncAt: Date | null;
  
  // Customer mapping (local ID -> QuickBooks ID)
  customerMapping: Record<string, string>;
  // Invoice mapping (local ID -> QuickBooks ID)
  invoiceMapping: Record<string, string>;
  // Employee/Vendor mapping (local ID -> QuickBooks ID)
  employeeMapping: Record<string, string>;
  
  // Actions
  updateSettings: (settings: Partial<QuickBooksSettings>) => void;
  addSyncLog: (log: Omit<QuickBooksSyncLog, "id" | "timestamp">) => void;
  clearSyncLogs: () => void;
  setCustomerMapping: (localId: string, qbId: string) => void;
  setInvoiceMapping: (localId: string, qbId: string) => void;
  setEmployeeMapping: (localId: string, qbId: string) => void;
  setLastSyncAt: (date: Date) => void;
}

export const useQuickBooksStore = create<QuickBooksState>()(
  persist(
    (set) => ({
      settings: {
        autoSyncInvoices: false,
        autoSyncCustomers: false,
        autoSyncPayroll: false,
        syncFrequency: "manual",
        defaultPaymentTerms: "Net 30",
        invoicePrefix: "INV-",
        defaultTaxRate: 0,
        notifyOnPayment: true,
        notifyOnOverdue: true,
      },
      syncLogs: [],
      lastSyncAt: null,
      customerMapping: {},
      invoiceMapping: {},
      employeeMapping: {},

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      addSyncLog: (log) =>
        set((state) => ({
          syncLogs: [
            {
              ...log,
              id: crypto.randomUUID(),
              timestamp: new Date(),
            },
            ...state.syncLogs.slice(0, 99), // Keep last 100 logs
          ],
        })),

      clearSyncLogs: () => set({ syncLogs: [] }),

      setCustomerMapping: (localId, qbId) =>
        set((state) => ({
          customerMapping: { ...state.customerMapping, [localId]: qbId },
        })),

      setInvoiceMapping: (localId, qbId) =>
        set((state) => ({
          invoiceMapping: { ...state.invoiceMapping, [localId]: qbId },
        })),

      setEmployeeMapping: (localId, qbId) =>
        set((state) => ({
          employeeMapping: { ...state.employeeMapping, [localId]: qbId },
        })),

      setLastSyncAt: (date) => set({ lastSyncAt: date }),
    }),
    {
      name: "quickbooks-store",
    }
  )
);
