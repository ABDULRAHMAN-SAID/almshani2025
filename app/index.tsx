import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Logo } from "@/components/Logo";
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
    <View style={styles.container}>
      <Animated.View style={{ opacity, transform: [{ translateY }], alignItems: "center" }}>
        <Logo size="lg" style={styles.logo} />
        <Text style={styles.appName}>أنشطتي</Text>
        <Text style={styles.subtitle}>قاعة صلالة الجوية</Text>
      </Animated.View>
    </View>
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
  appName: { ...typography.h1, color: colors.textOnPrimary, fontSize: 28, marginBottom: spacing.xs },
  subtitle: { fontFamily: "Tajawal_400Regular", fontSize: 15, color: "rgba(255,255,255,0.75)" },
});
