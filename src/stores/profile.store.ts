import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Profile } from "./types";

// ============================================
// PROFILE STORE - User Profile Data
// ============================================

interface ProfileState {
  profile: Profile | null;
  isLoading: boolean;
  isDirty: boolean;

  // Actions
  setProfile: (profile: Profile | null) => void;
  updateProfile: (updates: Partial<Profile>) => void;
  saveProfile: () => Promise<void>;
  resetProfile: () => void;
  setLoading: (loading: boolean) => void;
}

const defaultProfile: Profile = {
  id: "user_1",
  name: "Deyvisson Lander",
  email: "deyvisson@cleanpro.com",
  phone: "(00) 00000-0000",
  avatar_url: "",
  preferred_language: "pt-BR",
  preferred_theme: "system",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: defaultProfile,
      isLoading: false,
      isDirty: false,

      setProfile: (profile) => set({ profile, isDirty: false }),

      updateProfile: (updates) =>
        set((state) => ({
          profile: state.profile
            ? { ...state.profile, ...updates, updated_at: new Date().toISOString() }
            : null,
          isDirty: true,
        })),

      saveProfile: async () => {
        const { profile } = get();
        if (!profile) return;

        set({ isLoading: true });
        
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        set({ isLoading: false, isDirty: false });
      },

      resetProfile: () => set({ profile: defaultProfile, isDirty: false }),

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: "profile-storage",
      partialize: (state) => ({
        profile: state.profile,
      }),
    }
  )
);

// ============================================
// SELECTORS
// ============================================

export const useProfile = () => useProfileStore((state) => state.profile);
export const useProfileLoading = () => useProfileStore((state) => state.isLoading);
export const useProfileDirty = () => useProfileStore((state) => state.isDirty);
