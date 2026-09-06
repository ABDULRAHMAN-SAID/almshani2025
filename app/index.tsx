import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Logo } from "@/components/Logo";
import { PatternOverlay } from "@/components/PatternOverlay";
import { colors, spacing, typography } from "@/constants";
import { useAuthStore } from "@/store/authStore";

const MIN_SPLASH_MS = 1100;

/** شاشة البداية — شعار + اسم التطبيق، Animation هادئ، بدون تحميل طويل. */
export default function SplashScreen() {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  useEffect(() => {
    const start = Date.now();
    if (!hasHydrated) return;
    const elapsed = Date.now() - start;
    const remaining = Math.max(MIN_SPLASH_MS - elapsed, 0);
    const timer = setTimeout(() => {
      router.replace(user ? "/(tabs)" : "/(auth)/login");
    }, remaining);
    return () => clearTimeout(timer);
  }, [hasHydrated, user]);

  return (
    <LinearGradient
      colors={[colors.primaryLight, colors.primary, colors.primaryDark]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.container}
    >
      <PatternOverlay opacity={0.08} />
      <Animated.View style={{ opacity, transform: [{ translateY }], alignItems: "center" }}>
        <Logo size="lg" style={styles.logo} />
        <Text style={styles.appName}>أنشطتي</Text>
        <View style={styles.rule} />
        <Text style={styles.subtitle}>قاعدة صلالة الجوية</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { backgroundColor: "transparent", marginBottom: spacing.lg },
  appName: { ...typography.h1, color: colors.textOnPrimary, fontSize: 28 },
  rule: {
    width: 46,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.gold,
    marginVertical: spacing.sm,
  },
  subtitle: { fontFamily: "Tajawal_400Regular", fontSize: 15, color: "rgba(255,255,255,0.75)" },
});
