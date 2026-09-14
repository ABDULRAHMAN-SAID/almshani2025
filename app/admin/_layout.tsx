import { Stack } from "expo-router";
import { AdminUnlockGate } from "@/components/AdminUnlockGate";
import { colors } from "@/constants";
import { useAdminStore } from "@/store/adminStore";

/**
 * كل ما تحت /admin محمي هنا مرة واحدة: ما دام الوضع مقفلًا يُعرض حاجز الرمز
 * بدل أي شاشة إدارية، حتى لو فُتحت الشاشة برابط مباشر.
 */
export default function AdminLayout() {
  const isAdmin = useAdminStore((state) => state.isAdmin);

  if (!isAdmin) return <AdminUnlockGate />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
  );
}
