import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { FormField } from "@/components/FormField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { colors, radius, spacing, typography } from "@/constants";
import { changePassword, looksLikeEmail, sendPasswordReset, verifyPasswordReset } from "@/services/authService";
import { showToast } from "@/store/toastStore";
import { toArabicMessage } from "@/utils/errors";

const MIN_PASSWORD = 6;

/**
 * استعادة كلمة المرور برمزٍ يُكتب — لا برابطٍ يُفتح.
 *
 * والرابط كان يفشل بصمت: يُفتح في متصفّح الهاتف، فإن لم يُسلّمه المتصفّح إلى
 * التطبيق وقف صاحبه أمام صفحة لا يعرف ما يفعل بها. والرمز يُكتب هنا كما
 * يُكتب رمز التسجيل تمامًا، ثم تُكتب كلمة المرور في الشاشة نفسها — بلا
 * متصفّح ولا انتقال.
 *
 * ولا نخبر المستخدم أنّ البريد «غير مسجَّل»: ذلك يكشف من له حساب ومن ليس له
 * لأي شخص يجرّب عناوين. الجواب واحد في الحالتين.
 */
export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const valid = looksLikeEmail(email);
  const passwordError =
    password.length < MIN_PASSWORD
      ? `${MIN_PASSWORD} أحرف على الأقل`
      : confirm !== password
        ? "كلمتا المرور غير متطابقتين"
        : "";

  /** الرمز ثم كلمة المرور في نداءين: الأول يفتح جلسة الاستعادة، والثاني يكتب. */
  const handleReset = async () => {
    if (code.trim().length < 4) {
      showToast("اكتب الرمز الذي وصلك", "error");
      return;
    }
    if (passwordError) {
      showToast(passwordError, "error");
      return;
    }
    setLoading(true);
    try {
      await verifyPasswordReset(email, code);
      await changePassword(password);
      showToast("تم تغيير كلمة المرور — ادخل بها الآن", "success");
      router.replace("/(auth)/login");
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر تغيير كلمة المرور"), "error");
    } finally {
      setLoading(false);
    }
  };

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
      showToast(toArabicMessage(error, "تعذّر إرسال الرمز"), "error");
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
          <>
            <View style={styles.head}>
              <Text style={styles.title}>اكتب الرمز</Text>
              <Text style={styles.subtitle}>
                إن كان لهذا البريد حساب فقد وصله رمز من ستّة أرقام. اكتبه هنا مع كلمة المرور
                الجديدة.
              </Text>
            </View>

            <FormField
              label="الرمز"
              value={code}
              onChangeText={setCode}
              placeholder="000000"
              keyboardType="number-pad"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <FormField
              label="كلمة المرور الجديدة"
              value={password}
              onChangeText={setPassword}
              placeholder="٦ أحرف على الأقل"
              secureTextEntry
              autoCapitalize="none"
            />
            <FormField
              label="أعد كتابتها"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="نفس كلمة المرور"
              secureTextEntry
              autoCapitalize="none"
              onSubmitEditing={handleReset}
              returnKeyType="go"
            />

            <PrimaryButton
              label="غيّر كلمة المرور"
              onPress={handleReset}
              loading={loading}
              disabled={!code || !password || !confirm}
              style={styles.submit}
            />

            <Text style={styles.note}>
              لم يصل شيء؟ تحقّق من مجلد الرسائل غير المرغوبة (Spam)، أو أعد الإرسال.
            </Text>
            <PrimaryButton
              label="أعد إرسال الرمز"
              onPress={handleSubmit}
              loading={loading}
              style={styles.submit}
            />
          </>
        ) : (
          <>
            <View style={styles.head}>
              <Text style={styles.title}>استعادة كلمة المرور</Text>
              <Text style={styles.subtitle}>
                اكتب بريدك المسجَّل، ونرسل إليه رمزًا من ستّة أرقام لتعيين كلمة مرور جديدة.
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
              label="أرسل الرمز"
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
