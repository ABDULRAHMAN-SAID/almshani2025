import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "@/constants";
import { useConnection } from "@/hooks/useConnection";

/**
 * شريط يظهر أعلى التطبيق عند انقطاع الشبكة.
 * لا يحجب الاستخدام: ما حُمِّل يبقى معروضًا، ويُمنع الالتباس عند فشل أي عملية.
 */
export function OfflineBanner() {
  const { isOnline } = useConnection();
  if (isOnline) return null;

  return (
    <View style={styles.bar}>
      <Ionicons name="cloud-offline-outline" size={16} color={colors.textOnPrimary} />
      <Text style={styles.text}>لا يوجد اتصال بالإنترنت — ما تراه قد يكون قديمًا</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.warning,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  text: { ...typography.caption, color: colors.textOnPrimary, fontFamily: "Tajawal_500Medium" },
});
