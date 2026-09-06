import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "./persistStorage";

interface SettingsState {
  activityReminders: boolean;
  announcementAlerts: boolean;
  quizReminders: boolean;
  toggle: (key: "activityReminders" | "announcementAlerts" | "quizReminders") => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      activityReminders: true,
      announcementAlerts: true,
      quizReminders: true,
      toggle: (key) => set((state) => ({ ...state, [key]: !state[key] })),
    }),
    { name: "anshatati-settings", storage: persistStorage }
  )
);
