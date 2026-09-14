import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "@/constants";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onPressAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onPressAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={typography.h2}>{title}</Text>
      {actionLabel ? (
        <Pressable accessibilityRole="button" onPress={onPressAction} style={styles.action}>
          <Text style={styles.actionLabel}>{actionLabel}</Text>
          <Ionicons name="chevron-back" size={16} color={colors.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  action: { flexDirection: "row", alignItems: "center", gap: 2 },
  actionLabel: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: colors.accent },
});
