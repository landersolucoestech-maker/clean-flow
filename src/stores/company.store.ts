import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Company, BusinessHours } from "./types";

// ============================================
// COMPANY STORE - Company Settings & Data
// ============================================

interface CompanyState {
  company: Company | null;
  businessHours: BusinessHours[];
  isLoading: boolean;
  isDirty: boolean;

  // Actions
  setCompany: (company: Company | null) => void;
  updateCompany: (updates: Partial<Company>) => void;
  setBusinessHours: (hours: BusinessHours[]) => void;
  updateBusinessHour: (index: number, updates: Partial<BusinessHours>) => void;
  saveCompany: () => Promise<void>;
  resetCompany: () => void;
  setLoading: (loading: boolean) => void;
}

const defaultCompany: Company = {
  id: "company_1",
  legal_name: "CleanPro Services LLC",
  trade_name: "CleanPro Services",
  tax_id: "",
  country: "US",
  currency: "USD",
  timezone: "America/New_York", // EST timezone
  locale: "en-US",
  date_format: "MM/DD/YYYY",
  email: "info@cleanpro.com",
  phone: "(555) 987-6543",
  address: "123 Business Center, City, State 12345",
  logo_url: "",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const defaultBusinessHours: BusinessHours[] = [
  { day: "Monday", open: "08:00", close: "18:00", isOpen: true },
  { day: "Tuesday", open: "08:00", close: "18:00", isOpen: true },
  { day: "Wednesday", open: "08:00", close: "18:00", isOpen: true },
  { day: "Thursday", open: "08:00", close: "18:00", isOpen: true },
  { day: "Friday", open: "08:00", close: "18:00", isOpen: true },
  { day: "Saturday", open: "09:00", close: "16:00", isOpen: true },
  { day: "Sunday", open: "00:00", close: "00:00", isOpen: false },
];

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set, get) => ({
      company: defaultCompany,
      businessHours: defaultBusinessHours,
      isLoading: false,
      isDirty: false,

      setCompany: (company) => set({ company, isDirty: false }),

      updateCompany: (updates) =>
        set((state) => ({
          company: state.company
            ? { ...state.company, ...updates, updated_at: new Date().toISOString() }
            : null,
          isDirty: true,
        })),

      setBusinessHours: (hours) => set({ businessHours: hours, isDirty: true }),

      updateBusinessHour: (index, updates) =>
        set((state) => ({
          businessHours: state.businessHours.map((hour, i) =>
            i === index ? { ...hour, ...updates } : hour
          ),
          isDirty: true,
        })),

      saveCompany: async () => {
        const { company } = get();
        if (!company) return;

        set({ isLoading: true });
        
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        set({ isLoading: false, isDirty: false });
      },

      resetCompany: () => set({ 
        company: defaultCompany, 
        businessHours: defaultBusinessHours,
        isDirty: false 
      }),

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: "company-storage",
      partialize: (state) => ({
        company: state.company,
        businessHours: state.businessHours,
      }),
    }
  )
);

// ============================================
// LOCALE OPTIONS
// ============================================

export const COUNTRY_OPTIONS = [
  { value: "US", label: "United States", currency: "USD", locale: "en-US" },
  { value: "BR", label: "Brasil", currency: "BRL", locale: "pt-BR" },
  { value: "GB", label: "United Kingdom", currency: "GBP", locale: "en-GB" },
  { value: "DE", label: "Germany", currency: "EUR", locale: "de-DE" },
  { value: "FR", label: "France", currency: "EUR", locale: "fr-FR" },
  { value: "ES", label: "Spain", currency: "EUR", locale: "es-ES" },
  { value: "MX", label: "Mexico", currency: "MXN", locale: "es-MX" },
  { value: "CA", label: "Canada", currency: "CAD", locale: "en-CA" },
  { value: "AU", label: "Australia", currency: "AUD", locale: "en-AU" },
];

export const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Sao_Paulo", label: "Brasília Time (BRT)" },
  { value: "Europe/London", label: "Greenwich Mean Time (GMT)" },
  { value: "Europe/Paris", label: "Central European Time (CET)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST)" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET)" },
];

export const DATE_FORMAT_OPTIONS = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (US)" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (EU/BR)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (ISO)" },
];

export const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD - US Dollar", symbol: "$" },
  { value: "EUR", label: "EUR - Euro", symbol: "€" },
  { value: "GBP", label: "GBP - British Pound", symbol: "£" },
  { value: "BRL", label: "BRL - Brazilian Real", symbol: "R$" },
  { value: "CAD", label: "CAD - Canadian Dollar", symbol: "C$" },
  { value: "AUD", label: "AUD - Australian Dollar", symbol: "A$" },
  { value: "MXN", label: "MXN - Mexican Peso", symbol: "$" },
];

// ============================================
// SELECTORS
// ============================================

export const useCompany = () => useCompanyStore((state) => state.company);
export const useBusinessHours = () => useCompanyStore((state) => state.businessHours);
export const useCompanyLoading = () => useCompanyStore((state) => state.isLoading);
export const useCompanyDirty = () => useCompanyStore((state) => state.isDirty);
