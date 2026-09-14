import { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors, spacing, typography } from "@/constants";

interface ScreenHeaderProps {
  title: string;
  /** عنصر اختياري في الطرف المقابل (زر إجراء مثلًا). */
  action?: ReactNode;
  /** رأس فوق سطح كحلي بدل الخلفية الفاتحة. */
  onDark?: boolean;
}

/**
 * رأس موحّد للشاشات الداخلية: زر رجوع (سهم يشير يمينًا كما يقتضي اتجاه RTL)،
 * العنوان في المنتصف، ومساحة إجراء اختيارية.
 */
export function ScreenHeader({ title, action, onDark }: ScreenHeaderProps) {
  const tint = onDark ? colors.textOnPrimary : colors.textPrimary;
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="رجوع"
        onPress={() => router.back()}
        hitSlop={10}
      >
        <Ionicons name="chevron-forward" size={22} color={tint} />
      </Pressable>
      <Text style={[styles.title, { color: tint }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.action}>{action}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  title: { ...typography.h3, flex: 1, textAlign: "center" },
  action: { minWidth: 22, alignItems: "flex-start" },
});
