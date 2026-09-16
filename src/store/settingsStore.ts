import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "./persistStorage";

/** «تلقائي» يتبع إعداد الهاتف، والآخران يثبتان المظهر مهما كان الهاتف. */
export type ThemePreference = "system" | "light" | "dark";

interface SettingsState {
  activityReminders: boolean;
  announcementAlerts: boolean;
  quizReminders: boolean;
  theme: ThemePreference;
  /** هل قُرئت الإعدادات من التخزين؟ يُنتظر قبل أوّل رسم لئلّا يومض المظهر. */
  hasHydrated: boolean;
  toggle: (key: "activityReminders" | "announcementAlerts" | "quizReminders") => void;
  setTheme: (theme: ThemePreference) => void;
  setHasHydrated: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      activityReminders: true,
      announcementAlerts: true,
      quizReminders: true,
      theme: "system",
      hasHydrated: false,
      toggle: (key) => set((state) => ({ ...state, [key]: !state[key] })),
      setTheme: (theme) => set({ theme }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "anshatati-settings",
      storage: persistStorage,
      partialize: (state) => ({
        activityReminders: state.activityReminders,
        announcementAlerts: state.announcementAlerts,
        quizReminders: state.quizReminders,
        theme: state.theme,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
