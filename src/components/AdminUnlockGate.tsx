import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { PatternOverlay } from "@/components/PatternOverlay";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";
import { useAdminStore } from "@/store/adminStore";
import { showToast } from "@/store/toastStore";

/**
 * حاجز الدخول إلى لوحة الإدارة. يُعرض بدل أي شاشة إدارية ما دام الوضع مقفلًا،
 * فلا يمكن الوصول إلى شاشة إدارية عبر رابط مباشر.
 *
 * الحاجز لا يسأل عن «رمز إدارة»: يسأل الخادم عن صلاحية هذا الحساب. ثم — إن
 * فعّل صاحب الجهاز قفلًا رقميًا — يطلبه كطبقة ثانية.
 */
export function AdminUnlockGate() {
  const stage = useAdminStore((state) => state.stage);
  const error = useAdminStore((state) => state.error);
  const verify = useAdminStore((state) => state.verify);
  const unlockWithPin = useAdminStore((state) => state.unlockWithPin);
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (stage === "idle") void verify();
  }, [stage, verify]);

  const handlePin = () => {
    if (unlockWithPin(pin)) {
      showToast("تم فتح لوحة الإدارة", "success");
    } else {
      showToast("القفل غير صحيح", "error");
      setPin("");
    }
  };

  return (
    <View style={styles.screen}>
      <PatternOverlay opacity={0.06} />
      <ScreenHeader title="لوحة الإدارة" onDark />
      <View style={styles.body}>
        {stage === "checking" || stage === "idle" ? (
          <>
            <ActivityIndicator size="large" color={colors.gold} />
            <Text style={[styles.hint, { marginTop: spacing.lg }]}>جارٍ التحقق من صلاحية الحساب…</Text>
          </>
        ) : null}

        {stage === "denied" ? (
          <>
            <View style={styles.icon}>
              <Ionicons name="close-circle-outline" size={30} color={colors.accentLight} />
            </View>
            <Text style={styles.title}>هذا الحساب ليس إداريًا</Text>
            <Text style={styles.hint}>
              صلاحية الإدارة تُمنح من الخادم لحسابات محدّدة. راجع قسم الأنشطة إن كان يفترض أن
              يكون حسابك منها.
            </Text>
            <PrimaryButton
              label="العودة إلى التطبيق"
              onPress={() => router.replace("/(tabs)")}
              style={styles.button}
            />
          </>
        ) : null}

        {stage === "error" ? (
          <>
            <View style={styles.icon}>
              <Ionicons name="cloud-offline-outline" size={30} color={colors.gold} />
            </View>
            <Text style={styles.title}>تعذّر التحقق</Text>
            <Text style={styles.hint}>{error ?? "لم نتمكّن من الوصول إلى الخادم"}</Text>
            <PrimaryButton label="إعادة المحاولة" onPress={() => void verify()} style={styles.button} />
            <Pressable accessibilityRole="button" onPress={() => router.replace("/(tabs)")} hitSlop={8}>
              <Text style={styles.link}>العودة إلى التطبيق</Text>
            </Pressable>
          </>
        ) : null}

        {stage === "needs-pin" ? (
          <>
            <View style={styles.icon}>
              <Ionicons name="lock-closed-outline" size={28} color={colors.gold} />
            </View>
            <Text style={styles.title}>قفل الجهاز</Text>
            <Text style={styles.hint}>
              تحقّقت صلاحيتك. أدخل القفل الرقمي الذي ضبطته على هذا الجهاز.
            </Text>
            <TextInput
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              placeholder="••••"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              textAlign="center"
              onSubmitEditing={handlePin}
            />
            <PrimaryButton label="فتح" onPress={handlePin} disabled={!pin} style={styles.button} />
          </>
        ) : null}

        <Text style={styles.note}>
          الصلاحية تُقرَّر على الخادم بحسب جدول الإداريين، وكل عملية إدارية تُفحص هناك مرة أخرى —
          فتح هذه الشاشة وحده لا يمنح أي صلاحية.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primary },
  body: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.sm },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: { ...typography.h2, color: colors.textOnPrimary, textAlign: "center" },
  hint: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 13.5,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 320,
  },
  input: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    height: 56,
    fontFamily: "Tajawal_700Bold",
    fontSize: 22,
    letterSpacing: 10,
    marginTop: spacing.lg,
  },
  button: { width: "100%", marginTop: spacing.md, backgroundColor: colors.accent },
  link: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    textDecorationLine: "underline",
    marginTop: spacing.lg,
  },
  note: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 19,
    marginTop: spacing.xl,
    maxWidth: 340,
  },
});
