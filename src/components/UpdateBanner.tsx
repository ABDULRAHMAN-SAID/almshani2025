import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography, themed } from "@/constants";
import { useAppUpdate } from "@/hooks/useAppUpdate";

/**
 * إشعار داخل التطبيق حين ينزل تحديثٌ جديد على الجهاز.
 *
 * ولا يُعاد التحميل من تلقائه: من كان يكتب رسالة أو يملأ نموذجًا يفقد ما
 * كتبه. فيُعرض الخيار ويُترك القرار له، ويُطبَّق التحديث وحده عند الفتحة
 * التالية إن تجاهله.
 *
 * والحشوة العلوية تُحسب من الجهاز: الشريط أوّل ما يُرسم فوق كل شيء، فبلا
 * ذلك يقع تحت شريط الحالة — وهو بالضبط ما وقع لرؤوس الشاشات قبله.
 */
export function UpdateBanner() {
  const { updateReady, applyNow } = useAppUpdate();
  const insets = useSafeAreaInsets();
  if (!updateReady) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="تطبيق التحديث الآن"
      onPress={() => void applyNow()}
      style={({ pressed }) => [
        styles.bar,
        { marginTop: insets.top + spacing.sm },
        pressed ? styles.pressed : null,
      ]}
    >
      <Ionicons name="sparkles" size={20} color={colors.textOnPrimary} />
      <View style={styles.texts}>
        <Text style={styles.title}>وصل تحديث جديد للتطبيق</Text>
        <Text style={styles.hint}>اضغط هنا لتطبيقه الآن</Text>
      </View>
      <Ionicons name="chevron-back" size={18} color={colors.textOnPrimary} />
    </Pressable>
  );
}

const styles = themed(() => ({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.success,
    borderRadius: radius.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  pressed: { opacity: 0.85 },
  texts: { flex: 1, gap: 1 },
  title: { ...typography.body, color: colors.textOnPrimary, fontFamily: "Tajawal_700Bold", fontSize: 14 },
  hint: { ...typography.caption, color: "rgba(255,255,255,0.88)", fontSize: 12 },
}));
