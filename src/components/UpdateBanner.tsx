import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "@/constants";
import { useAppUpdate } from "@/hooks/useAppUpdate";

/**
 * شريط يظهر حين يكون تحديثٌ جاهزًا على الجهاز.
 *
 * ولا يُعاد التحميل من تلقائه: من كان يكتب رسالة أو يملأ نموذجًا يفقد ما
 * كتبه. فيُعرض الخيار ويُترك القرار له، ويُطبَّق التحديث وحده عند الفتحة
 * التالية إن تجاهله.
 */
export function UpdateBanner() {
  const { updateReady, applyNow } = useAppUpdate();
  if (!updateReady) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="تطبيق التحديث الآن"
      onPress={() => void applyNow()}
      style={styles.bar}
    >
      <Ionicons name="arrow-down-circle-outline" size={18} color={colors.textOnPrimary} />
      <Text style={styles.text}>تحديث جديد جاهز</Text>
      <View style={styles.spacer} />
      <Text style={styles.action}>تطبيقه الآن</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    margin: spacing.md,
  },
  text: { ...typography.body, color: colors.textOnPrimary, fontSize: 14 },
  spacer: { flex: 1 },
  action: { ...typography.body, color: colors.textOnPrimary, fontSize: 13, textDecorationLine: "underline" },
});
