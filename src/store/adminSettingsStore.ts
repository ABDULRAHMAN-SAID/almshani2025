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

/**
 * بيانات التواصل الرسمية لقسم الأنشطة — تظهر لكل المستخدمين في شاشة «تواصل معنا».
 * لا تحتوي على أي رقم شخصي لمستخدم؛ هي خط القسم فقط.
 */
export interface ContactInfo {
  department: string;
  phone: string;
  whatsapp: string;
  email: string;
  office: string;
  hours: string;
}

export interface AdminLogEntry {
  id: string;
  action: string;
  at: string;
}

interface AdminSettingsState {
  /**
   * قفل رقمي على هذا الجهاز فقط، فوق تحقق الخادم من الصلاحية.
   * مطفأ افتراضيًا، ولا يمنح صلاحية بذاته — من ليس في جدول admins لا تفتح له
   * اللوحة مهما أدخل، ولا تُقبل له عملية إدارية على الخادم.
   */
  devicePin: string;
  devicePinEnabled: boolean;
  pointsPerAction: number;
  defaultRegistrationStatus: RegistrationState;
  contact: ContactInfo;
  admins: AdminAccount[];
  log: AdminLogEntry[];

  setDevicePin: (pin: string) => void;
  setDevicePinEnabled: (enabled: boolean) => void;
  setPointsPerAction: (points: number) => void;
  setDefaultRegistrationStatus: (status: RegistrationState) => void;
  setContact: (patch: Partial<ContactInfo>) => void;
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
      devicePin: "",
      devicePinEnabled: false,
      pointsPerAction: 10,
      defaultRegistrationStatus: "open",
      contact: {
        department: "قسم الأنشطة — قاعدة صلالة الجوية",
        phone: "23299000",
        whatsapp: "96823299000",
        email: "anshatati.salalah@example.om",
        office: "مبنى الأنشطة — الدور الأول",
        hours: "الأحد إلى الخميس، 8:00 صباحًا — 2:00 ظهرًا",
      },
      admins: [{ id: "adm-1", name: "مسؤول الأنشطة", phone: "91234567" }],
      log: [],

      setDevicePin: (pin) => set({ devicePin: pin.trim() }),
      setDevicePinEnabled: (enabled) => set({ devicePinEnabled: enabled }),
      setPointsPerAction: (points) => set({ pointsPerAction: points }),
      setDefaultRegistrationStatus: (status) => set({ defaultRegistrationStatus: status }),
      addAdmin: (name, phone) =>
        set((state) => ({
          admins: [...state.admins, { id: `adm-${Date.now()}`, name: name.trim(), phone: phone.trim() }],
        })),
      setContact: (patch) => set((state) => ({ contact: { ...state.contact, ...patch } })),
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
      version: 3,
      // الترقية من النسخة 1: كان يُحفظ "رمز إدارة" مشترك يمنح الصلاحية.
      // نحذفه ولا نحوّله إلى قفل جهاز، حتى لا يبقى رمز قديم فاعلًا بعد التحديث.
      migrate: (persisted) => {
        const state = { ...(persisted as Record<string, unknown>) };
        delete state.code;
        // مفاتيح التشغيل انتقلت إلى الخادم؛ ما بقي منها على الأجهزة يُهمَل حتى
        // لا يبقى مصدران للحقيقة الواحدة.
        for (const key of [
          "quizEnabled", "pointsEnabled", "registrationEnabled",
          "discussionEnabled", "messagesEnabled",
        ]) {
          delete state[key];
        }
        return { ...state, devicePin: "", devicePinEnabled: false } as AdminSettingsState;
      },
      partialize: (state) => ({
        devicePin: state.devicePin,
        devicePinEnabled: state.devicePinEnabled,
        pointsPerAction: state.pointsPerAction,
        defaultRegistrationStatus: state.defaultRegistrationStatus,
        contact: state.contact,
        admins: state.admins,
        log: state.log,
      }),
    }
  )
);

/** قراءة الإعدادات من خارج React (طبقة الخدمات). */
export const adminSettings = () => useAdminSettingsStore.getState();
