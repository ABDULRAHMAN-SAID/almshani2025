import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Logo } from "@/components/Logo";
import { PrimaryButton } from "@/components/PrimaryButton";
import { colors, radius, spacing, typography } from "@/constants";
import { requestOtp } from "@/services/authService";
import { useAuth } from "@/hooks/useAuth";
import { showToast } from "@/store/toastStore";
import type { LoginRole } from "@/store/authStore";

const PHONE_REGEX = /^(?:\+968)?9\d{7}$/;

const ROLES: {
  key: LoginRole;
  label: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    key: "user",
    label: "مستخدم",
    hint: "تصفّح الأنشطة، سجّل فيها، واجمع النقاط",
    icon: "person-outline",
  },
  {
    key: "admin",
    label: "إدارة",
    hint: "إضافة وتعديل وحذف، إعلانات وإشعارات، وإعدادات التطبيق",
    icon: "shield-checkmark-outline",
  },
];

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const { setPendingPhone, pendingRole, setPendingRole } = useAuth();

  const isValid = PHONE_REGEX.test(phone.trim());
  const selected = ROLES.find((role) => role.key === pendingRole) ?? ROLES[0];

  const handleSubmit = async () => {
    if (!isValid) {
      showToast("الرجاء إدخال رقم هاتف عماني صحيح", "error");
      return;
    }
    setLoading(true);
    try {
      await requestOtp(phone.trim());
      setPendingPhone(phone.trim());
      router.push("/(auth)/otp");
    } catch {
      showToast("تعذّر إرسال رمز التحقق، حاول مرة أخرى", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Logo size="lg" />
          <Text style={styles.title}>أنشطتي</Text>
          <Text style={styles.subtitle}>قاعدة صلالة الجوية</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>نوع الدخول</Text>
          <View style={styles.roleRow}>
            {ROLES.map((role) => {
              const active = role.key === pendingRole;
              return (
                <Pressable
                  key={role.key}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => setPendingRole(role.key)}
                  style={({ pressed }) => [
                    styles.roleCard,
                    active && styles.roleCardActive,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <View style={[styles.roleIcon, active && styles.roleIconActive]}>
                    <Ionicons
                      name={role.icon}
                      size={20}
                      color={active ? colors.textOnPrimary : colors.primary}
                    />
                  </View>
                  <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>{role.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.roleHint}>{selected.hint}</Text>

          <Text style={[styles.label, { marginTop: spacing.lg }]}>رقم الهاتف</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="9XXXXXXX"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            textAlign="right"
            maxLength={12}
          />
          <Text style={styles.hint}>
            {pendingRole === "admin"
              ? "سنرسل لك رمز تحقق (OTP)، ثم تُفتح اللوحة إن كان حسابك مُدرجًا في قائمة الإداريين"
              : "سنرسل لك رمز تحقق (OTP) عبر رسالة نصية"}
          </Text>

          <PrimaryButton
            label={pendingRole === "admin" ? "متابعة كإدارة" : "إرسال رمز التحقق"}
            onPress={handleSubmit}
            loading={loading}
            disabled={!phone}
            style={styles.submitButton}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, padding: spacing.xl, justifyContent: "center", gap: spacing.xl },
  header: { alignItems: "center", gap: spacing.xs },
  title: { ...typography.h1, marginTop: spacing.md },
  subtitle: { ...typography.bodyMuted },
  form: { gap: spacing.sm },
  label: { ...typography.h3 },
  roleRow: { flexDirection: "row", gap: spacing.md },
  roleCard: {
    flex: 1,
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  roleCardActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  roleIconActive: { backgroundColor: "rgba(255,255,255,0.14)" },
  roleLabel: { ...typography.body, fontFamily: "Tajawal_500Medium" },
  roleLabelActive: { color: colors.textOnPrimary },
  roleHint: { ...typography.caption, textAlign: "center", lineHeight: 19 },
  input: {
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    height: 52,
    backgroundColor: colors.surface,
  },
  hint: { ...typography.caption, lineHeight: 19 },
  submitButton: { marginTop: spacing.lg },
});
