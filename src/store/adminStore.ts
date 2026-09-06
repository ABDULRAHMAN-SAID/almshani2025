import { create } from "zustand";

/**
 * وضع الإدارة. لا يُحفظ في التخزين عمدًا: يُطلب الرمز في كل جلسة،
 * ولا يظهر أي أثر للوحة الإدارة للمستخدم العادي.
 * عند ربط Supabase يُستبدل هذا بتحقق فعلي من صلاحية الحساب.
 */
const ADMIN_CODE = "1234";

interface AdminState {
  isAdmin: boolean;
  unlock: (code: string) => boolean;
  lock: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  isAdmin: false,
  unlock: (code) => {
    const ok = code.trim() === ADMIN_CODE;
    if (ok) set({ isAdmin: true });
    return ok;
  },
  lock: () => set({ isAdmin: false }),
}));
