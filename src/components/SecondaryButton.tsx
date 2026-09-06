import { Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import { colors, radius, spacing } from "@/constants";

interface SecondaryButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textColor?: string;
}

export function SecondaryButton({ label, onPress, disabled, style, textColor }: SecondaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.base, disabled && styles.disabled, pressed && styles.pressed, style]}
    >
      <Text style={[styles.label, textColor ? { color: textColor } : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.background },
  disabled: { opacity: 0.5 },
  label: { fontFamily: "Tajawal_500Medium", fontSize: 15, color: colors.primary },
});
