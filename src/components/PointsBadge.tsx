import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/constants";

interface PointsBadgeProps {
  points: number;
  onPress?: () => void;
}

/** شارة صغيرة لعرض رصيد النقاط — تُستخدم في رأس الرئيسية والملف الشخصي. */
export function PointsBadge({ points, onPress }: PointsBadgeProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.badge, pressed && styles.pressed]}
    >
      <Ionicons name="star" size={14} color={colors.gold} />
      <Text style={styles.text}>{points}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(199,162,82,0.14)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  pressed: { opacity: 0.8 },
  text: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#8a6d2c" },
});
