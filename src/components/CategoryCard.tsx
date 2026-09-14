import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { tintBackground } from "@/constants/categories";
import { colors, radius, shadow, spacing, typography } from "@/constants";

interface CategoryCardProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** لمسة اللون الخاصة بالقسم — الأيقونة بها وخلفيتها بدرجة خفيفة منها. */
  tint?: string;
  /**
   * "card" بطاقة قائمة بذاتها، و"plain" خليّة داخل لوح موحّد.
   *
   * اثنتا عشرة بطاقة طافية على خلفية رمادية تُقرأ ضجيجًا: اثنا عشر ظلًّا واثنا
   * عشر حدًّا لشيء واحد هو «أقسام التطبيق». اللوح الواحد يجمعها فيهدأ السطح
   * ويبقى التمييز للأيقونات الملوّنة وحدها.
   */
  variant?: "card" | "plain";
  onPress?: () => void;
}

/** بطاقة قسم أيقونية في شبكة الأقسام الرئيسية. */
export function CategoryCard({
  label,
  icon,
  tint = colors.primary,
  variant = "card",
  onPress,
}: CategoryCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === "card" ? [styles.card, shadow.subtle] : styles.plain,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: tintBackground(tint) }]}>
        <Ionicons name={icon} size={23} color={tint} />
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: "center",
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    // حدّ شعري مع ظلّ خفيف: يفصل البطاقة عن الخلفية دون أن يثقلها.
    borderWidth: 1,
    borderColor: colors.border,
  },
  plain: { backgroundColor: "transparent" },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { ...typography.h3, fontSize: 12, lineHeight: 16, textAlign: "center" },
});
