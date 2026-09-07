import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "./persistStorage";
import type { User } from "@/types/models";

/** الدور المختار في شاشة الدخول — يحدد الوجهة بعد التحقق من الرمز. */
export type LoginRole = "user" | "admin";

interface AuthState {
  user: User | null;
  pendingPhone: string | null;
  pendingRole: LoginRole;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setPendingPhone: (phone: string) => void;
  setPendingRole: (role: LoginRole) => void;
  signIn: (user: User) => void;
  updateName: (name: string) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      pendingPhone: null,
      pendingRole: "user",
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setPendingPhone: (phone) => set({ pendingPhone: phone }),
      setPendingRole: (role) => set({ pendingRole: role }),
      signIn: (user) => set({ user, pendingPhone: null }),
      updateName: (name) =>
        set((state) => (state.user ? { user: { ...state.user, name } } : state)),
      signOut: () => set({ user: null, pendingPhone: null, pendingRole: "user" }),
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
