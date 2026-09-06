import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { PrimaryButton } from "@/components/PrimaryButton";
import { colors, spacing, typography } from "@/constants";
import { completeProfile } from "@/services/authService";
import { useAuth } from "@/hooks/useAuth";
import { showToast } from "@/store/toastStore";

export default function ProfileSetupScreen() {
  const { userId, phone } = useLocalSearchParams<{ userId: string; phone: string }>();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async () => {
    if (name.trim().length < 3) {
      showToast("الرجاء إدخال الاسم الكامل", "error");
      return;
    }
    setLoading(true);
    try {
      const user = await completeProfile(userId, phone, name.trim());
      signIn(user);
      router.replace("/(tabs)");
    } catch {
      showToast("حدث خطأ، حاول مرة أخرى", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>مرحبًا بك</Text>
      <Text style={styles.subtitle}>أدخل اسمك الكامل لإكمال إنشاء الحساب</Text>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="الاسم الكامل"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        textAlign="right"
      />

      <PrimaryButton
        label="إنشاء الحساب"
        onPress={handleSubmit}
        loading={loading}
        disabled={!name}
        style={styles.submitButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, justifyContent: "center", gap: spacing.md },
  title: { ...typography.h1, textAlign: "center", marginBottom: spacing.xs },
  subtitle: { ...typography.bodyMuted, textAlign: "center", marginBottom: spacing.lg },
  input: {
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    height: 52,
    backgroundColor: colors.surface,
  },
  submitButton: { marginTop: spacing.lg },
});
