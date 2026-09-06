import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { tintBackground } from "@/constants/categories";
import { colors, radius, shadow, spacing, typography } from "@/constants";

interface CategoryCardProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** لمسة اللون الخاصة بالقسم — الأيقونة بها وخلفيتها بدرجة خفيفة منها. */
  tint?: string;
  onPress?: () => void;
}

/** بطاقة قسم أيقونية في شبكة الأقسام الرئيسية. */
export function CategoryCard({ label, icon, tint = colors.primary, onPress }: CategoryCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, shadow.card, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: tintBackground(tint) }]}>
        <Ionicons name={icon} size={26} color={tint} />
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xs,
    alignItems: "center",
    gap: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { ...typography.h3, fontSize: 12.5, lineHeight: 17, textAlign: "center" },
});
