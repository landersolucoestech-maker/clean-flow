import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Company, CompanyUser } from "./types";

// ============================================
// SESSION STORE - Current User & Company Context
// ============================================

interface SessionState {
  // Current user
  user: User | null;
  // Current active company
  activeCompany: Company | null;
  // All companies user belongs to
  companies: Company[];
  // Current company membership
  membership: CompanyUser | null;
  // Authentication state
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setActiveCompany: (company: Company | null) => void;
  setCompanies: (companies: Company[]) => void;
  setMembership: (membership: CompanyUser | null) => void;
  switchCompany: (companyId: string) => void;
  login: (user: User, companies: Company[], activeCompanyId?: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      user: null,
      activeCompany: null,
      companies: [],
      membership: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setActiveCompany: (company) => set({ activeCompany: company }),

      setCompanies: (companies) => set({ companies }),

      setMembership: (membership) => set({ membership }),

      switchCompany: (companyId) => {
        const { companies } = get();
        const company = companies.find((c) => c.id === companyId);
        if (company) {
          set({ activeCompany: company });
        }
      },

      login: (user, companies, activeCompanyId) => {
        const activeCompany = activeCompanyId
          ? companies.find((c) => c.id === activeCompanyId) || companies[0]
          : companies[0];

        set({
          user,
          companies,
          activeCompany: activeCompany || null,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: () => {
        set({
          user: null,
          activeCompany: null,
          companies: [],
          membership: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: "session-storage",
      partialize: (state) => ({
        user: state.user,
        activeCompany: state.activeCompany,
        companies: state.companies,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ============================================
// SELECTORS
// ============================================

export const useCurrentUser = () => useSessionStore((state) => state.user);
export const useActiveCompany = () => useSessionStore((state) => state.activeCompany);
export const useIsAuthenticated = () => useSessionStore((state) => state.isAuthenticated);
export const useCompanyId = () => useSessionStore((state) => state.activeCompany?.id);
