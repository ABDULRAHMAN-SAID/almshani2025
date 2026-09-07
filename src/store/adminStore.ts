import { create } from "zustand";
import { adminSettings } from "./adminSettingsStore";

/**
 * وضع الإدارة. لا يُحفظ في التخزين عمدًا: يُطلب الرمز في كل جلسة،
 * وإغلاق التطبيق يقفل اللوحة. الرمز نفسه يُقرأ من إعدادات الإدارة
 * (قابل للتغيير)، وعند ربط Supabase يُستبدل بتحقق فعلي من صلاحية الحساب.
 */
interface AdminState {
  isAdmin: boolean;
  unlock: (code: string) => boolean;
  lock: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  isAdmin: false,
  unlock: (code) => {
    const ok = code.trim() === adminSettings().code;
    if (ok) {
      set({ isAdmin: true });
      adminSettings().logAction("فتح لوحة الإدارة");
    }
    return ok;
  },
  lock: () => set({ isAdmin: false }),
}));
