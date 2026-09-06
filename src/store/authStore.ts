import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "./persistStorage";
import type { User } from "@/types/models";

interface AuthState {
  user: User | null;
  pendingPhone: string | null;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setPendingPhone: (phone: string) => void;
  signIn: (user: User) => void;
  updateName: (name: string) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      pendingPhone: null,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setPendingPhone: (phone) => set({ pendingPhone: phone }),
      signIn: (user) => set({ user, pendingPhone: null }),
      updateName: (name) =>
        set((state) => (state.user ? { user: { ...state.user, name } } : state)),
      signOut: () => set({ user: null, pendingPhone: null }),
    }),
    {
      name: "anshatati-auth",
      storage: persistStorage,
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
