import { useEffect, useRef } from "react";
import { Animated, Keyboard, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/constants";
import { useToastStore } from "@/store/toastStore";

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  success: "checkmark-circle",
  error: "alert-circle",
  info: "information-circle",
};

/** كم يبقى كل نوع على الشاشة. النجاح والخطأ يُقرآن، والخبر العابر يمرّ. */
const HOLD: Record<string, number> = { success: 3200, error: 6000, info: 2200 };

/**
 * يُركّب مرة واحدة في الجذر — يعرض رسالة قصيرة تؤكّد ما حدث.
 *
 * أعلى الشاشة لا أسفلها: كان أسفلها، ولوحة المفاتيح تغطّي ذلك الموضع تمامًا
 * على أندرويد. فمن ملأ نموذجًا وضغط «نشر» لم ير شيئًا — لا «تمّ» ولا خطأ —
 * فبدا له أن ما كتبه ضاع. ولهذا أيضًا تُغلق لوحة المفاتيح عند ظهور الرسالة:
 * لتُرى الشاشة التي تحتها، ولأن العمل انتهى فلا حاجة إليها.
 */
export function ToastHost() {
  const { message, variant, hide } = useToastStore();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const offset = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    if (!message) return;
    Keyboard.dismiss();
    offset.setValue(-12);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(offset, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]),
      Animated.delay(HOLD[variant] ?? HOLD.info),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(({ finished }) => finished && hide());
  }, [message, variant, opacity, offset, hide]);

  if (!message) return null;

  const success = variant === "success";
  const error = variant === "error";
  const tint = error ? colors.danger : success ? colors.success : colors.primary;

  return (
    <Animated.View
      // ‏pointerEvents: لا تبتلع الرسالة لمسةً في الشاشة التي تحتها.
      pointerEvents="none"
      style={[
        styles.container,
        {
          top: insets.top + spacing.sm,
          opacity,
          transform: [{ translateY: offset }],
          backgroundColor: success ? colors.success : colors.surface,
          borderColor: success ? colors.success : error ? colors.danger : colors.border,
        },
      ]}
    >
      <Ionicons name={ICONS[variant]} size={20} color={success ? "#FFFFFF" : tint} />
      <Text style={[styles.text, success && styles.textOnFill]}>{message}</Text>
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
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    maxWidth: "92%",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 1000,
  },
  text: { fontFamily: "Tajawal_500Medium", fontSize: 14, color: colors.textPrimary, flexShrink: 1 },
  textOnFill: { color: "#FFFFFF", fontFamily: "Tajawal_700Bold" },
});
