import { create } from "zustand";
import { verifyAdminAccess } from "@/services/adminAuthService";
import { adminSettings } from "./adminSettingsStore";

/**
 * وضع الإدارة — لا يُحفظ في التخزين عمدًا: يُعاد التحقق في كل جلسة.
 *
 * بوابتان بترتيب ثابت:
 *   1. الخادم يقرّر: هل الحساب مُدرج في جدول admins؟ هذه هي الصلاحية.
 *   2. قفل الجهاز الرقمي (اختياري، مطفأ افتراضيًا) — طبقة إضافية على هذا
 *      الجهاز فقط، لا تمنح صلاحية ولا تُرسَل إلى أي مكان.
 *
 * تجاوز البوابتين في التطبيق لا يفيد شيئًا: كل عملية إدارية تُفحص على الخادم
 * مرة أخرى بسياسات RLS ودوال is_admin().
 */
export type AdminStage =
  | "idle"        // لم يبدأ التحقق بعد
  | "checking"    // ننتظر جواب الخادم
  | "denied"      // الحساب ليس إداريًا
  | "error"       // تعذّر الوصول إلى الخادم
  | "needs-pin"   // إداري، وبقي قفل الجهاز
  | "open";       // اللوحة مفتوحة لهذه الجلسة

interface AdminState {
  stage: AdminStage;
  /** رسالة الخطأ عند تعذّر التحقق. */
  error: string | null;
  /** اللوحة مفتوحة فعلًا. */
  isAdmin: boolean;
  /** يسأل الخادم عن الصلاحية، ثم يطلب قفل الجهاز إن كان مفعّلًا. */
  verify: () => Promise<AdminStage>;
  /** فتح قفل الجهاز — الخطوة الثانية فقط، ولا تُستدعى قبل تحقق الخادم. */
  unlockWithPin: (pin: string) => boolean;
  lock: () => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  stage: "idle",
  error: null,
  isAdmin: false,

  verify: async () => {
    set({ stage: "checking", error: null, isAdmin: false });
    try {
      const allowed = await verifyAdminAccess();
      if (!allowed) {
        set({ stage: "denied", isAdmin: false });
        return "denied";
      }

      const settings = adminSettings();
      if (settings.devicePinEnabled && settings.devicePin.length > 0) {
        set({ stage: "needs-pin", isAdmin: false });
        return "needs-pin";
      }

      settings.logAction("فتح لوحة الإدارة");
      set({ stage: "open", isAdmin: true });
      return "open";
    } catch (error) {
      set({
        stage: "error",
        isAdmin: false,
        error: error instanceof Error ? error.message : "تعذّر التحقق من الصلاحية",
      });
      return "error";
    }
  },

  unlockWithPin: (pin) => {
    // لا يفتح القفل الرقمي شيئًا ما لم يكن الخادم قد أقرّ الصلاحية أولًا.
    if (get().stage !== "needs-pin") return false;
    if (pin.trim() !== adminSettings().devicePin) return false;
    adminSettings().logAction("فتح لوحة الإدارة");
    set({ stage: "open", isAdmin: true });
    return true;
  },

  lock: () => set({ stage: "idle", isAdmin: false, error: null }),
}));
