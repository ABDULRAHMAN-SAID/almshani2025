import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { colors, spacing, typography } from "@/constants";
import { requestOtp, verifyOtp } from "@/services/authService";
import { useAuth } from "@/hooks/useAuth";
import { showToast } from "@/store/toastStore";

export default function OtpScreen() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { pendingPhone } = useAuth();

  const handleVerify = async () => {
    if (!pendingPhone) {
      router.replace("/(auth)/login");
      return;
    }
    setLoading(true);
    try {
      const { isNewUser, userId } = await verifyOtp(pendingPhone, code);
      if (isNewUser) {
        router.push({ pathname: "/(auth)/profile-setup", params: { userId, phone: pendingPhone } });
      } else {
        router.replace("/(tabs)");
      }
    } catch {
      showToast("رمز التحقق غير صحيح", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingPhone) return;
    await requestOtp(pendingPhone);
    showToast("تم إرسال رمز جديد");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>التحقق من رقم الهاتف</Text>
      <Text style={styles.subtitle}>أدخل رمز التحقق المرسل إلى {pendingPhone ?? "رقمك"}</Text>

      <TextInput
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={4}
        placeholder="0000"
        placeholderTextColor={colors.textMuted}
        style={styles.otpInput}
        textAlign="center"
      />

      <PrimaryButton
        label="تأكيد"
        onPress={handleVerify}
        loading={loading}
        disabled={code.length !== 4}
        style={styles.confirmButton}
      />
      <SecondaryButton label="إعادة إرسال الرمز" onPress={handleResend} style={styles.resendButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, justifyContent: "center", gap: spacing.lg },
  title: { ...typography.h1, textAlign: "center" },
  subtitle: { ...typography.bodyMuted, textAlign: "center", marginBottom: spacing.lg },
  otpInput: {
    ...typography.h1,
    letterSpacing: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    height: 64,
    backgroundColor: colors.surface,
  },
  confirmButton: { marginTop: spacing.lg },
  resendButton: { borderColor: "transparent", backgroundColor: "transparent" },
});
