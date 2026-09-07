import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PatternOverlay } from "@/components/PatternOverlay";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";
import { useAdminStore } from "@/store/adminStore";
import { showToast } from "@/store/toastStore";

/**
 * حاجز الدخول إلى لوحة الإدارة. يُعرض بدل أي شاشة إدارية ما دام الوضع مقفلًا،
 * فلا يمكن الوصول إلى شاشة إدارية عبر رابط مباشر دون إدخال الرمز.
 */
export function AdminUnlockGate() {
  const unlock = useAdminStore((state) => state.unlock);
  const [code, setCode] = useState("");

  const handleUnlock = () => {
    if (unlock(code)) {
      showToast("تم فتح لوحة الإدارة", "success");
    } else {
      showToast("الرمز غير صحيح", "error");
      setCode("");
    }
  };

  return (
    <View style={styles.screen}>
      <PatternOverlay opacity={0.06} />
      <ScreenHeader title="لوحة الإدارة" onDark />
      <View style={styles.body}>
        <View style={styles.icon}>
          <Ionicons name="lock-closed-outline" size={28} color={colors.gold} />
        </View>
        <Text style={styles.title}>هذه الشاشة للإدارة فقط</Text>
        <Text style={styles.hint}>أدخل رمز الإدارة للمتابعة</Text>
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
        <PrimaryButton label="دخول" onPress={handleUnlock} disabled={!code} style={styles.button} />
        <Text style={styles.note}>
          في هذه النسخة التجريبية الرمز هو 1234، وهو حاجز واجهة لا أكثر. عند ربط Supabase تُستبدل هذه
          الشاشة بتحقق فعلي من صلاحية الحساب، وكل عملية إدارية تُفحص على الخادم أيضًا.
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
  title: { ...typography.h2, color: colors.textOnPrimary },
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
  note: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 19,
    marginTop: spacing.lg,
  },
});
