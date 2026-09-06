import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/constants";
import { useToastStore } from "@/store/toastStore";

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  success: "checkmark-circle",
  error: "alert-circle",
  info: "information-circle",
};

/** يُركّب مرة واحدة في الجذر — يعرض رسائل قصيرة (Toast) أسفل الشاشة. */
export function ToastHost() {
  const { message, variant, hide } = useToastStore();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(({ finished }) => finished && hide());
  }, [message, opacity, hide]);

  if (!message) return null;

  const tint = variant === "error" ? colors.danger : variant === "success" ? colors.success : colors.primary;

  return (
    <Animated.View style={[styles.container, { bottom: insets.bottom + spacing.xl, opacity }]}>
      <Ionicons name={ICONS[variant]} size={18} color={tint} />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    maxWidth: "90%",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: colors.textPrimary, flexShrink: 1 },
});
