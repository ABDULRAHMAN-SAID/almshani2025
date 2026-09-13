import type { AdminAccount } from "@/store/adminSettingsStore";
import { adminSettings } from "@/store/adminSettingsStore";
import { useAuthStore } from "@/store/authStore";
import { normalizePhone } from "@/utils/identity";
import { USE_MOCK_DATA } from "./config";
import { supabase } from "./supabase";

/**
 * صلاحية الإدارة.
 *
 * مصدر الصلاحية هو الخادم وحده: الحساب مُدرج في جدول `admins` أو لا. الدالة
 * `is_admin()` تعمل بـ SECURITY DEFINER فلا يستطيع العميل تزوير نتيجتها،
 * وكل سياسة كتابة إدارية في المخطط تستدعيها بنفسها — فحتى لو تلاعب أحد
 * بالتطبيق على جهازه وأظهر شاشات اللوحة، تُرفض كل عملية على الخادم.
 *
 * لا يوجد «رمز إدارة مشترك» يمنح صلاحية. القفل الرقمي في الإعدادات قفل جهاز
 * إضافي اختياري فوق هذا التحقق، لا بديلًا عنه.
 */

/** يسأل الخادم: هل الحساب الحالي إداري؟ */
export async function verifyAdminAccess(): Promise<boolean> {
  if (!USE_MOCK_DATA) {
    const { data, error } = await supabase.rpc("is_admin");
    if (error) throw error;
    return data === true;
  }

  // الوضع التجريبي لا خادم فيه: نطابق رقم الحساب مع قائمة الإداريين المحلية.
  // هذا للعرض فقط، وليس نموذج الصلاحية الذي يعمل في الإنتاج.
  //
  // والمطابقة بالصيغة الدولية لا بالأرقام المجرّدة: الحساب يُحفظ ‎+96891234567
  // بينما تُكتب القائمة 91234567، فمقارنة الأرقام كما هي لا تتطابق أبدًا —
  // وكانت لوحة العرض لا تُفتح لأحد بسببها.
  const phone = useAuthStore.getState().user?.phone;
  if (!phone) return false;
  const normalized = normalizePhone(phone);
  return adminSettings().admins.some((admin) => normalizePhone(admin.phone) === normalized);
}

/**
 * قائمة الحسابات الإدارية.
 *
 * على الخادم تُقرأ من جدول `admins` (سياسة القراءة تسمح للإداريين وحدهم)،
 * والإضافة والإزالة تتمّان من Supabase لا من التطبيق — حتى لا يصبح فتح اللوحة
 * على جهاز واحد كافيًا لترقية حسابات أخرى.
 */
export async function fetchAdminAccounts(): Promise<AdminAccount[]> {
  if (USE_MOCK_DATA) {
    return adminSettings().admins;
  }

  const { data, error } = await supabase
    .from("admins")
    .select("user_id, users(full_name, phone)")
    .order("created_at", { ascending: true });
  if (error) throw error;

  type Row = { user_id: string; users: { full_name: string | null; phone: string | null } | null };
  return ((data as unknown as Row[]) ?? []).map((row) => ({
    id: row.user_id,
    name: row.users?.full_name ?? "حساب إداري",
    phone: row.users?.phone ?? "",
  }));
}

/** هل تُدار الحسابات من داخل التطبيق؟ لا في الإنتاج — تُدار من Supabase. */
export const canEditAdminsInApp = USE_MOCK_DATA;
