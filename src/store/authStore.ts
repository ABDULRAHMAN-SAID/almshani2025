import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "./persistStorage";
import type { User } from "@/types/models";

/**
 * حالة الحساب على الجهاز.
 *
 * لا يوجد «دور» يُختار قبل الدخول: الصلاحية يقرّرها الخادم من جدول admins
 * بعده. ولا رقم معلّق بانتظار رمز: الدخول بكلمة مرور في خطوة واحدة.
 */
interface AuthState {
  user: User | null;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  signIn: (user: User) => void;
  updateName: (name: string) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      signIn: (user) => set({ user }),
      updateName: (name) =>
        set((state) => (state.user ? { user: { ...state.user, name } } : state)),
      signOut: () => set({ user: null }),
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
