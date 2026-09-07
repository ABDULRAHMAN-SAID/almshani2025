import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "./persistStorage";
import type { RegistrationState } from "@/types/models";

export interface AdminAccount {
  id: string;
  name: string;
  /** يُخزَّن كاملًا للتحقق، ولا يُعرض إلا مقنّعًا. */
  phone: string;
}

export interface AdminLogEntry {
  id: string;
  action: string;
  at: string;
}

interface AdminSettingsState {
  /** رمز فتح اللوحة — قابل للتغيير من الإعدادات. */
  code: string;
  pointsPerAction: number;
  defaultRegistrationStatus: RegistrationState;
  quizEnabled: boolean;
  pointsEnabled: boolean;
  registrationEnabled: boolean;
  admins: AdminAccount[];
  log: AdminLogEntry[];

  setCode: (code: string) => void;
  setPointsPerAction: (points: number) => void;
  setDefaultRegistrationStatus: (status: RegistrationState) => void;
  toggle: (key: "quizEnabled" | "pointsEnabled" | "registrationEnabled") => void;
  addAdmin: (name: string, phone: string) => void;
  removeAdmin: (id: string) => void;
  logAction: (action: string) => void;
  clearLog: () => void;
}

/** يخفي وسط الرقم: 9•••4567 — يكفي للتعرّف دون كشف الرقم كاملًا. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 5) return "•••";
  return `${digits.slice(0, 1)}•••${digits.slice(-4)}`;
}

export const useAdminSettingsStore = create<AdminSettingsState>()(
  persist(
    (set) => ({
      code: "1234",
      pointsPerAction: 10,
      defaultRegistrationStatus: "open",
      quizEnabled: true,
      pointsEnabled: true,
      registrationEnabled: true,
      admins: [{ id: "adm-1", name: "مسؤول الأنشطة", phone: "91234567" }],
      log: [],

      setCode: (code) => set({ code: code.trim() }),
      setPointsPerAction: (points) => set({ pointsPerAction: points }),
      setDefaultRegistrationStatus: (status) => set({ defaultRegistrationStatus: status }),
      toggle: (key) => set((state) => ({ [key]: !state[key] }) as Partial<AdminSettingsState>),
      addAdmin: (name, phone) =>
        set((state) => ({
          admins: [...state.admins, { id: `adm-${Date.now()}`, name: name.trim(), phone: phone.trim() }],
        })),
      removeAdmin: (id) => set((state) => ({ admins: state.admins.filter((a) => a.id !== id) })),
      logAction: (action) =>
        set((state) => ({
          log: [{ id: `log-${Date.now()}`, action, at: new Date().toISOString() }, ...state.log].slice(0, 100),
        })),
      clearLog: () => set({ log: [] }),
    }),
    {
      name: "anshatati-admin-settings",
      storage: persistStorage,
      partialize: (state) => ({
        code: state.code,
        pointsPerAction: state.pointsPerAction,
        defaultRegistrationStatus: state.defaultRegistrationStatus,
        quizEnabled: state.quizEnabled,
        pointsEnabled: state.pointsEnabled,
        registrationEnabled: state.registrationEnabled,
        admins: state.admins,
        log: state.log,
      }),
    }
  )
);

/** قراءة الإعدادات من خارج React (طبقة الخدمات). */
export const adminSettings = () => useAdminSettingsStore.getState();
