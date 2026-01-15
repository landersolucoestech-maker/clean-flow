import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TeamMember, UserStatus } from "./types";

// ============================================
// TEAM STORE - Team Member Management
// ============================================

interface TeamState {
  members: TeamMember[];
  isLoading: boolean;

  // Actions
  setMembers: (members: TeamMember[]) => void;
  addMember: (member: TeamMember) => void;
  updateMember: (memberId: string, updates: Partial<TeamMember>) => void;
  removeMember: (memberId: string) => void;
  updateMemberStatus: (memberId: string, status: UserStatus) => void;
  updateMemberRole: (memberId: string, roleId: string, roleName: string) => void;
  inviteMember: (email: string, roleId: string, roleName: string) => TeamMember;
  
  // Queries
  getMemberById: (memberId: string) => TeamMember | undefined;
  getMembersByStatus: (status: UserStatus) => TeamMember[];
  getMembersByRole: (roleId: string) => TeamMember[];
  getActiveMembers: () => TeamMember[];
  
  setLoading: (loading: boolean) => void;
}

const defaultMembers: TeamMember[] = [
  {
    id: "tm_1",
    user_id: "user_1",
    company_id: "company_1",
    name: "Deyvisson Lander",
    email: "deyvisson@cleanpro.com",
    phone: "(555) 123-4567",
    role_id: "admin",
    role_name: "Admin",
    status: "active",
    joined_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    last_active_at: new Date().toISOString(),
  },
  {
    id: "tm_2",
    user_id: "user_2",
    company_id: "company_1",
    name: "Maria Silva",
    email: "maria@cleanpro.com",
    phone: "(555) 234-5678",
    role_id: "manager",
    role_name: "Manager",
    status: "active",
    joined_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    last_active_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "tm_3",
    user_id: "user_3",
    company_id: "company_1",
    name: "John Doe",
    email: "john@cleanpro.com",
    role_id: "staff",
    role_name: "Staff / Cleaner",
    status: "invited",
    invited_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    invited_by: "user_1",
  },
  {
    id: "tm_4",
    user_id: "user_4",
    company_id: "company_1",
    name: "Jane Smith",
    email: "jane@cleanpro.com",
    role_id: "finance",
    role_name: "Finance",
    status: "active",
    joined_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    last_active_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "tm_5",
    user_id: "user_5",
    company_id: "company_1",
    name: "Carlos Rodriguez",
    email: "carlos@cleanpro.com",
    role_id: "staff",
    role_name: "Staff / Cleaner",
    status: "suspended",
    joined_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    suspended_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const useTeamStore = create<TeamState>()(
  persist(
    (set, get) => ({
      members: defaultMembers,
      isLoading: false,

      setMembers: (members) => set({ members }),

      addMember: (member) =>
        set((state) => ({
          members: [...state.members, member],
        })),

      updateMember: (memberId, updates) =>
        set((state) => ({
          members: state.members.map((m) =>
            m.id === memberId ? { ...m, ...updates } : m
          ),
        })),

      removeMember: (memberId) =>
        set((state) => ({
          members: state.members.filter((m) => m.id !== memberId),
        })),

      updateMemberStatus: (memberId, status) =>
        set((state) => ({
          members: state.members.map((m) =>
            m.id === memberId
              ? {
                  ...m,
                  status,
                  ...(status === "suspended" ? { suspended_at: new Date().toISOString() } : {}),
                  ...(status === "active" && m.status === "invited" ? { joined_at: new Date().toISOString() } : {}),
                }
              : m
          ),
        })),

      updateMemberRole: (memberId, roleId, roleName) =>
        set((state) => ({
          members: state.members.map((m) =>
            m.id === memberId ? { ...m, role_id: roleId, role_name: roleName } : m
          ),
        })),

      inviteMember: (email, roleId, roleName) => {
        const newMember: TeamMember = {
          id: `tm_${Date.now()}`,
          user_id: `user_${Date.now()}`,
          company_id: "company_1",
          name: email.split("@")[0],
          email,
          role_id: roleId,
          role_name: roleName,
          status: "invited",
          invited_at: new Date().toISOString(),
          invited_by: "user_1", // Current user
        };
        set((state) => ({
          members: [...state.members, newMember],
        }));
        return newMember;
      },

      getMemberById: (memberId) => {
        return get().members.find((m) => m.id === memberId);
      },

      getMembersByStatus: (status) => {
        return get().members.filter((m) => m.status === status);
      },

      getMembersByRole: (roleId) => {
        return get().members.filter((m) => m.role_id === roleId);
      },

      getActiveMembers: () => {
        return get().members.filter((m) => m.status === "active");
      },

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: "team-storage",
      partialize: (state) => ({
        members: state.members,
      }),
    }
  )
);

// ============================================
// STATUS LABELS & COLORS
// ============================================

export const STATUS_CONFIG: Record<UserStatus, { label: string; color: string }> = {
  invited: { label: "Convidado", color: "bg-warning/10 text-warning" },
  active: { label: "Ativo", color: "bg-success/10 text-success" },
  suspended: { label: "Suspenso", color: "bg-destructive/10 text-destructive" },
  locked: { label: "Bloqueado", color: "bg-destructive/10 text-destructive" },
  terminated: { label: "Desligado", color: "bg-muted text-muted-foreground" },
};

// ============================================
// SELECTORS
// ============================================

export const useTeamMembers = () => useTeamStore((state) => state.members);
export const useTeamLoading = () => useTeamStore((state) => state.isLoading);
export const useActiveTeamMembers = () => useTeamStore((state) => state.getActiveMembers());
