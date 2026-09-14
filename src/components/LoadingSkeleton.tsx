import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type ViewStyle } from "react-native";
import { colors, radius } from "@/constants";

interface SkeletonBlockProps {
  width?: number | `${number}%`;
  height?: number;
  style?: ViewStyle;
}

function SkeletonBlock({ width = "100%", height = 16, style }: SkeletonBlockProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius.sm, backgroundColor: colors.border, opacity }, style]}
    />
  );
}

/** بديل بصري أثناء تحميل بطاقة نشاط (Hero أو أفقية). */
export function ActivitySkeletonCard() {
  return (
    <View style={styles.card}>
      <SkeletonBlock height={120} style={{ marginBottom: 12 }} />
      <SkeletonBlock width="70%" height={16} style={{ marginBottom: 8 }} />
      <SkeletonBlock width="40%" height={12} />
    </View>
  );
}

export { SkeletonBlock };

const styles = StyleSheet.create({
  card: {
    width: 220,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
  },
});
