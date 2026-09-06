import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { colors, radius, spacing } from "@/constants";

export interface FilterChipItem {
  key: string;
  label: string;
}

interface FilterChipsProps {
  items: FilterChipItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

/** شريط فلاتر أفقي موحّد — يُستخدم في التقويم والمسابقات والمحاضرات. */
export function FilterChips({ items, activeKey, onChange }: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(item.key)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingEnd: spacing.lg },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: colors.textMuted },
  labelActive: { color: colors.textOnPrimary },
});
