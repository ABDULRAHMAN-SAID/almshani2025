import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PhoneFrame } from "@/components/PhoneFrame";
import { DemoApp } from "@/components/DemoApp";
import { colors, radius, spacing, themed, typography } from "@/constants";
import { PRICE_LABEL, PERIOD_LABEL } from "@/product/plan";
import { demoOf, TEMPLATES } from "@/product/templates";
import { useProjectStore } from "@/store/projectStore";

/**
 * أوّل شاشة: ما هذا، ولمن، وبكم.
 *
 * وثلاثة هواتف مائلة في الصدر لا كلامٌ عن «حلولٍ رقمية»: صاحب المشروع يقرّر
 * بعينه لا بأذنه، ورؤيةُ ثلاث واجهاتٍ جاهزة تقول ما لا يقوله سطرٌ تسويقي.
 */
export default function Welcome() {
  const started = useProjectStore((state) => state.started);
  const hasHydrated = useProjectStore((state) => state.hasHydrated);
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(rise, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [rise]);

  // من بدأ مشروعه لا يُعاد إلى صفحة البيع في كل فتحة.
  useEffect(() => {
    if (hasHydrated && started) router.replace("/(tabs)");
  }, [hasHydrated, started]);

  const lift = rise.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });
  const show = [0, 1, 2].map((index) =>
    rise.interpolate({ inputRange: [index * 0.18, 0.5 + index * 0.18], outputRange: [0, 1], extrapolate: "clamp" })
  );

  const trio = [TEMPLATES[0], TEMPLATES[3], TEMPLATES[1]];

  return (
    <LinearGradient
      colors={[colors.primaryLight, colors.primary, colors.primaryDark]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.screen}
    >
      <View style={styles.stage}>
        {trio.map((template, index) => (
          <Animated.View
            key={template.id}
            style={[
              styles.phone,
              {
                opacity: show[index],
                transform: [
                  { translateY: lift },
                  { translateX: (index - 1) * 96 },
                  { rotate: `${(index - 1) * 9}deg` },
                  { scale: index === 1 ? 1 : 0.88 },
                ],
                zIndex: index === 1 ? 3 : 1,
              },
            ]}
            pointerEvents="none"
          >
            <PhoneFrame width={176} statusTint={template.skin.hero === "plain" ? "#14201A" : "#FFFFFF"}>
              <DemoApp project={demoOf(template.id)} template={template} />
            </PhoneFrame>
          </Animated.View>
        ))}
      </View>

      <Animated.View style={[styles.copy, { opacity: rise, transform: [{ translateY: lift }] }]}>
        <Text style={styles.brand}>واجهة</Text>
        <Text style={styles.headline}>موقعك وتطبيقك{"\n"}في مساءٍ واحد</Text>
        <Text style={styles.sub}>
          ستّة تطبيقاتٍ تعمل — افتحها وجرّبها قبل أن تدفع. ثم اكتب اسمك ومحتواك وانشر.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(tabs)")}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>شاهد النماذج</Text>
          <Ionicons name="arrow-back" size={18} color={colors.primary} />
        </Pressable>

        <Text style={styles.terms}>
          {`شاهدها وجرّبها مجانًا · وتطبيقك ${PRICE_LABEL} ${PERIOD_LABEL}`}
        </Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = themed(() => ({
  screen: { flex: 1, justifyContent: "flex-end" },
  stage: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: spacing.xxl },
  phone: { position: "absolute" },
  copy: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  brand: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: colors.marine, letterSpacing: 1.5 },
  headline: { ...typography.h1, fontSize: 25, lineHeight: 36 },
  sub: { ...typography.bodyMuted, lineHeight: 23 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
  },
  pressed: { opacity: 0.85 },
  ctaText: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: colors.primary },
  terms: { ...typography.caption, textAlign: "center", marginTop: 2 },
}));
