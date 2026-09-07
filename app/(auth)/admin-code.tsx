import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { PatternOverlay } from "@/components/PatternOverlay";
import { PrimaryButton } from "@/components/PrimaryButton";
import { colors, radius, spacing, typography } from "@/constants";
import { useAdminStore } from "@/store/adminStore";
import { showToast } from "@/store/toastStore";

/**
 * الخطوة الثانية لدخول الإدارة: بعد التحقق من الهاتف يُطلب رمز الإدارة.
 * من يدخل بدور "مستخدم" لا يمر بهذه الشاشة إطلاقًا.
 */
export default function AdminCodeScreen() {
  const unlock = useAdminStore((state) => state.unlock);
  const [code, setCode] = useState("");

  const handleUnlock = () => {
    if (unlock(code)) {
      showToast("مرحبًا بك في لوحة التحكم", "success");
      router.replace("/admin");
    } else {
      showToast("رمز الإدارة غير صحيح", "error");
      setCode("");
    }
  };

  return (
    <View style={styles.screen}>
      <PatternOverlay opacity={0.06} />
      <View style={styles.body}>
        <View style={styles.icon}>
          <Ionicons name="shield-checkmark-outline" size={30} color={colors.gold} />
        </View>
        <Text style={styles.title}>دخول الإدارة</Text>
        <Text style={styles.hint}>أدخل رمز الإدارة لفتح لوحة التحكم</Text>

        <TextInput
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          secureTextEntry
          placeholder="••••"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          textAlign="center"
          onSubmitEditing={handleUnlock}
        />

        <PrimaryButton
          label="فتح لوحة التحكم"
          onPress={handleUnlock}
          disabled={!code}
          style={styles.button}
        />

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/(tabs)")}
          hitSlop={8}
          style={styles.skip}
        >
          <Text style={styles.skipText}>المتابعة كمستخدم عادي بدلًا من ذلك</Text>
        </Pressable>

        <Text style={styles.note}>
          الرمز الافتراضي في هذه النسخة هو 1234، ويمكن تغييره من إعدادات اللوحة. عند ربط Supabase
          يُستبدل هذا الحاجز بتحقق فعلي من صلاحية الحساب، وكل عملية إدارية تُفحص على الخادم أيضًا.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primary },
  body: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.sm },
  icon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: { ...typography.h1, color: colors.textOnPrimary },
  hint: { fontFamily: "Tajawal_400Regular", fontSize: 13.5, color: "rgba(255,255,255,0.7)" },
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
  skip: { marginTop: spacing.lg },
  skipText: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    textDecorationLine: "underline",
  },
  note: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 19,
    marginTop: spacing.lg,
  },
});
