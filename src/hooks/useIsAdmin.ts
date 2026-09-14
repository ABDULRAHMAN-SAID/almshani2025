import { useQuery } from "@tanstack/react-query";
import { verifyAdminAccess } from "@/services/adminAuthService";
import { useAuthStore } from "@/store/authStore";

/**
 * هل الحساب الحالي إداري؟
 *
 * للعرض وحده: نُظهر مدخل اللوحة لمن له صلاحية بدل أن يبحث عنه. أمّا المنع
 * فليس هنا — الصلاحية تُقرَّر على الخادم، وكل عملية إدارية تُفحص هناك مرة
 * أخرى، فلا يضرّ أن يفتح أحدٌ الشاشة بلا صلاحية.
 *
 * وعند الفشل نُعيد false: يبقى المدخل المخفيّ (ضغطة مطوّلة) طريقًا لمن يعرفه.
 */
export function useIsAdmin() {
  const userId = useAuthStore((s) => s.user?.id);
  const { data } = useQuery({
    queryKey: ["is-admin", userId],
    queryFn: () => verifyAdminAccess().catch(() => false),
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
  });
  return Boolean(data);
}
