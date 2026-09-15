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
    .select("user_id, role, users(full_name, phone)")
    .order("created_at", { ascending: true });
  if (error) throw error;

  type Row = { user_id: string; role: string | null; users: { full_name: string | null; phone: string | null } | null };
  return ((data as unknown as Row[]) ?? []).map((row) => ({
    id: row.user_id,
    name: row.users?.full_name ?? "حساب إداري",
    phone: row.users?.phone ?? "",
    role: (row.role as AdminRole | null) ?? "admin",
  }));
}

// أُزيلت canEditAdminsInApp: كانت تقول «لا تُدار من التطبيق» بينما الشاشة
// تعرض زرّ إضافة يكتب في ذاكرة الجهاز. الإدارة الآن حقيقية وعلى الخادم.

/* ============ الدرجات: المنح والسحب من داخل التطبيق ============ */

export type AdminRole = "owner" | "admin" | "editor";

export const ROLE_LABEL: Record<AdminRole, string> = {
  owner: "المالك",
  admin: "إداري",
  editor: "محرّر",
};

export const ROLE_HINT: Record<AdminRole, string> = {
  owner: "كل شيء، ولا تُسحب صلاحيته",
  admin: "إدارة كاملة، ويمنح درجة المحرّر",
  editor: "المحتوى فقط: أخبار وإعلانات وتوعية وأسئلة",
};

export interface FoundMember {
  userId: string;
  name: string;
  phone: string;
  email?: string;
  role?: AdminRole;
}

/** درجة الحساب الحالي — لتُعرض الأزرار التي يملكها فعلًا لا أكثر. */
export async function fetchMyRole(): Promise<AdminRole | null> {
  if (USE_MOCK_DATA) return "owner";
  const { data, error } = await supabase.rpc("admin_role");
  if (error) throw error;
  return (data as AdminRole | null) ?? null;
}

/**
 * بحث عن عضو ببريده أو رقمه أو اسمه.
 *
 * يمرّ بدالة على الخادم لا باستعلام مباشر: سياسة `users` تقصر القراءة على
 * صاحب الصفّ، وفتحُها للإداريين كان سيكشف بيانات كل عضو لكل إداري. والدالة
 * تفحص الدرجة بنفسها وتعيد ما يلزم للترقية وحده.
 */
export async function findMember(query: string): Promise<FoundMember[]> {
  if (USE_MOCK_DATA) return [];
  const { data, error } = await supabase.rpc("find_member", { p_query: query.trim() });
  if (error) throw error;
  type Row = { user_id: string; full_name: string | null; phone: string | null; email: string | null; role: AdminRole | null };
  return ((data as Row[]) ?? []).map((row) => ({
    userId: row.user_id,
    name: row.full_name ?? "عضو",
    phone: row.phone ?? "",
    email: row.email ?? undefined,
    role: row.role ?? undefined,
  }));
}

/** يمنح درجة. الخادم يفحص درجة المانح ويرفض ما ليس له. */
export async function grantAdmin(userId: string, role: Exclude<AdminRole, "owner">): Promise<void> {
  if (USE_MOCK_DATA) return;
  const { error } = await supabase.rpc("grant_admin", { p_user_id: userId, p_role: role });
  if (error) throw error;
}

/** يسحب الصلاحية. المالك لا تُسحب صلاحيته، ولا يسحب أحدٌ من نفسه. */
export async function revokeAdmin(userId: string): Promise<void> {
  if (USE_MOCK_DATA) return;
  const { error } = await supabase.rpc("revoke_admin", { p_user_id: userId });
  if (error) throw error;
}
