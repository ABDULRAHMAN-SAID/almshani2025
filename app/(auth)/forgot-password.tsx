import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { FormField } from "@/components/FormField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { colors, radius, spacing, typography } from "@/constants";
import { looksLikeEmail, sendPasswordReset } from "@/services/authService";
import { showToast } from "@/store/toastStore";
import { toArabicMessage } from "@/utils/errors";

/**
 * استعادة كلمة المرور بالبريد.
 *
 * لا نخبر المستخدم أنّ البريد «غير مسجَّل»: ذلك يكشف من له حساب ومن ليس له
 * لأي شخص يجرّب عناوين. الرسالة واحدة في الحالتين، والرابط لا يصل إلا لمن
 * يملك الصندوق فعلًا.
 */
export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const valid = looksLikeEmail(email);

  const handleSubmit = async () => {
    if (!valid) {
      showToast("أدخل بريدًا صحيحًا", "error");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر إرسال الرابط"), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="رجوع"
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.back}
        >
          <Ionicons name="arrow-forward" size={22} color={colors.textPrimary} />
        </Pressable>

        {sent ? (
          <View style={styles.done}>
            <View style={styles.doneIcon}>
              <Ionicons name="mail-open-outline" size={30} color={colors.success} />
            </View>
            <Text style={styles.title}>تفقّد بريدك</Text>
            <Text style={styles.body}>
              إن كان هناك حساب بهذا البريد فقد وصله رابط لتعيين كلمة مرور جديدة. افتح الرابط من
              الهاتف نفسه.
            </Text>
            <Text style={styles.note}>لم يصل شيء؟ تحقّق من مجلد الرسائل غير المرغوبة (Spam).</Text>
            <PrimaryButton
              label="رجوع لتسجيل الدخول"
              onPress={() => router.replace("/(auth)/login")}
              style={styles.submit}
            />
          </View>
        ) : (
          <>
            <View style={styles.head}>
              <Text style={styles.title}>استعادة كلمة المرور</Text>
              <Text style={styles.subtitle}>
                اكتب بريدك المسجَّل، ونرسل إليه رابطًا لتعيين كلمة مرور جديدة.
              </Text>
            </View>

            <FormField
              label="البريد الإلكتروني"
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleSubmit}
              returnKeyType="go"
            />

            <PrimaryButton
              label="إرسال الرابط"
              onPress={handleSubmit}
              loading={loading}
              disabled={!email}
              style={styles.submit}
            />

            <View style={styles.notice}>
              <Ionicons name="information-circle-outline" size={17} color={colors.marineDeep} />
              <Text style={styles.noticeText}>
                الاستعادة بالبريد وحده. إن لم تسجّل بريدًا عند إنشاء حسابك، راجع قسم الأنشطة من
                «تواصل معنا».
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.xl, paddingTop: spacing.xxl, gap: spacing.lg },
  back: { alignSelf: "flex-start" },
  head: { gap: spacing.xs },
  title: { ...typography.h1 },
  subtitle: { ...typography.bodyMuted, lineHeight: 23 },
  submit: { marginTop: spacing.sm },
  notice: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.infoSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  noticeText: { ...typography.caption, flex: 1, fontSize: 11.5, lineHeight: 18 },
  done: { alignItems: "center", gap: spacing.md, paddingTop: spacing.xxl },
  doneIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { ...typography.body, textAlign: "center", lineHeight: 24, color: colors.textSecondary },
  note: { ...typography.caption, textAlign: "center" },
});
