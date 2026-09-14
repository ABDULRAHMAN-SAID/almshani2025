import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { FormField } from "@/components/FormField";
import { Logo } from "@/components/Logo";
import { PrimaryButton } from "@/components/PrimaryButton";
import { colors, spacing, typography } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { signInWithPassword } from "@/services/authService";
import { showToast } from "@/store/toastStore";
import { toArabicMessage } from "@/utils/errors";

/**
 * شاشة الدخول: رقم الهاتف أو البريد، وكلمة المرور.
 *
 * لا يوجد اختيار «مستخدم / إدارة» هنا: الصلاحية يقرّرها الخادم من جدول
 * admins بعد الدخول، لا اختيارٌ يُتخذ قبله. ولوحة الإدارة تظهر لمن يملكها
 * وحده.
 */
export default function LoginScreen() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const ready = identifier.trim().length > 3 && password.length > 0;

  const handleSubmit = async () => {
    if (!ready) {
      showToast("أدخل رقمك أو بريدك وكلمة المرور", "error");
      return;
    }
    setLoading(true);
    try {
      const user = await signInWithPassword(identifier, password);
      signIn(user);
      router.replace("/(tabs)");
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر تسجيل الدخول"), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Logo size="lg" />
          <Text style={styles.title}>أنشطتي</Text>
          <Text style={styles.subtitle}>قاعدة صلالة الجوية</Text>
        </View>

        <View style={styles.form}>
          <FormField
            label="رقم الهاتف أو البريد الإلكتروني"
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="9XXXXXXX  أو  name@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
          />

          <FormField
            label="كلمة المرور"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secure
            autoCapitalize="none"
            textContentType="password"
            onSubmitEditing={handleSubmit}
            returnKeyType="go"
          />

          <Pressable
            accessibilityRole="link"
            onPress={() => router.push("/(auth)/forgot-password")}
            hitSlop={8}
            style={styles.forgotWrap}
          >
            <Text style={styles.forgot}>هل نسيت كلمة المرور؟</Text>
          </Pressable>

          <PrimaryButton
            label="تسجيل الدخول"
            onPress={handleSubmit}
            loading={loading}
            disabled={!ready}
            style={styles.submit}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>لا تمتلك حسابًا؟</Text>
          <Pressable accessibilityRole="link" onPress={() => router.push("/(auth)/register")} hitSlop={8}>
            <Text style={styles.footerLink}>إنشاء حساب</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.xl },
  header: { alignItems: "center", gap: spacing.xs },
  title: { ...typography.h1, marginTop: spacing.md },
  subtitle: { ...typography.bodyMuted },
  form: { gap: spacing.md },
  forgotWrap: { alignSelf: "flex-start" },
  forgot: { ...typography.caption, fontSize: 12.5, color: colors.marineDeep, fontFamily: "Tajawal_500Medium" },
  submit: { marginTop: spacing.sm },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: spacing.xs },
  footerText: { ...typography.caption, fontSize: 13 },
  footerLink: { ...typography.caption, fontSize: 13, color: colors.marineDeep, fontFamily: "Tajawal_700Bold" },
});
