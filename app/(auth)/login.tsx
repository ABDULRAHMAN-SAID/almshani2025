import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Logo } from "@/components/Logo";
import { PrimaryButton } from "@/components/PrimaryButton";
import { colors, spacing, typography } from "@/constants";
import { requestOtp } from "@/services/authService";
import { useAuth } from "@/hooks/useAuth";
import { showToast } from "@/store/toastStore";

const PHONE_REGEX = /^(?:\+968)?9\d{7}$/;

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const { setPendingPhone } = useAuth();

  const isValid = PHONE_REGEX.test(phone.trim());

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
          <Text style={styles.label}>رقم الهاتف</Text>
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
          <Text style={styles.hint}>سنرسل لك رمز تحقق (OTP) عبر رسالة نصية</Text>

          <PrimaryButton
            label="إرسال رمز التحقق"
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
  container: { flex: 1, padding: spacing.xl, justifyContent: "center", gap: spacing.xxl },
  header: { alignItems: "center", gap: spacing.xs },
  title: { ...typography.h1, marginTop: spacing.md },
  subtitle: { ...typography.bodyMuted },
  form: { gap: spacing.sm },
  label: { ...typography.h3 },
  input: {
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    height: 52,
    backgroundColor: colors.surface,
  },
  hint: { ...typography.caption },
  submitButton: { marginTop: spacing.lg },
});
