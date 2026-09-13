import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { FormField } from "@/components/FormField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { colors, radius, spacing, typography } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { USE_MOCK_DATA } from "@/services/config";
import { CODE_LENGTH, confirmSignUpCode, resendSignUpCode } from "@/services/authService";
import { showToast } from "@/store/toastStore";
import { toArabicMessage } from "@/utils/errors";

/** ثوانٍ قبل السماح بطلب رمز جديد — الخادم نفسه يحدّ من التكرار. */
const RESEND_AFTER = 60;

/**
 * إدخال رمز تأكيد الحساب.
 *
 * الحساب أُنشئ على الخادم ولم تُفتح له جلسة بعد: لا شيء يُكتب باسمه، ولا صفّ
 * له في جدول الأعضاء، حتى يُدخل الرمز الذي وصل إلى بريده أو هاتفه. وهذا هو
 * الفرق بين حسابٍ يملكه صاحبه وحسابٍ سجّله أحدهم برقم غيره.
 */
export default function VerifyScreen() {
  const params = useLocalSearchParams<{ destination?: string; channel?: string }>();
  const destination = params.destination ?? "";
  const bySms = params.channel === "sms";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(RESEND_AFTER);
  const { signIn } = useAuth();
  const submitted = useRef(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const digits = code.replace(/\D/g, "");

  const handleSubmit = async () => {
    if (digits.length !== CODE_LENGTH) {
      showToast(`الرمز ${CODE_LENGTH} أرقام`, "error");
      return;
    }
    // الضغط مرتين بسرعة كان يرسل الرمز مرتين، فيُقبل الأول ويُقال عن الثاني
    // إنه خاطئ — والمستخدم يرى رسالة خطأ بعد نجاحٍ تمّ فعلًا.
    if (submitted.current) return;
    submitted.current = true;
    setLoading(true);
    try {
      const user = await confirmSignUpCode(destination, digits);
      signIn(user);
      showToast("تم تأكيد حسابك", "success");
      router.replace("/(tabs)");
    } catch (error) {
      submitted.current = false;
      showToast(toArabicMessage(error, "الرمز غير صحيح"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendSignUpCode(destination);
      setSeconds(RESEND_AFTER);
      showToast("أُرسل رمز جديد", "success");
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر إرسال رمز جديد"), "error");
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

        <View style={styles.icon}>
          <Ionicons
            name={bySms ? "chatbubble-ellipses-outline" : "mail-open-outline"}
            size={30}
            color={colors.marineDeep}
          />
        </View>

        <View style={styles.head}>
          <Text style={styles.title}>أدخل رمز التأكيد</Text>
          <Text style={styles.subtitle}>
            {bySms ? "أرسلنا رسالة فيها رمز من ستة أرقام إلى " : "أرسلنا رمزًا من ستة أرقام إلى "}
            <Text style={styles.destination}>{destination}</Text>
          </Text>
        </View>

        <FormField
          label="الرمز"
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
          placeholder="------"
          keyboardType="number-pad"
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={handleSubmit}
          returnKeyType="go"
        />

        <PrimaryButton
          label="تأكيد"
          onPress={handleSubmit}
          loading={loading}
          disabled={digits.length !== CODE_LENGTH}
          style={styles.submit}
        />

        {seconds > 0 ? (
          <Text style={styles.wait}>يمكن طلب رمز جديد بعد {seconds} ثانية</Text>
        ) : (
          <Pressable accessibilityRole="button" onPress={handleResend} hitSlop={8}>
            <Text style={styles.resend}>لم يصل الرمز؟ أرسله مرة أخرى</Text>
          </Pressable>
        )}

        {USE_MOCK_DATA ? (
          <View style={styles.demo}>
            <Ionicons name="flask-outline" size={17} color={colors.danger} />
            <Text style={styles.demoText}>
              نسخة عرض: لم تُرسل رسالة، ولن تصل. اكتب أي ستة أرقام لتكمل. الرمز الحقيقي يصل بعد
              ربط الخادم.
            </Text>
          </View>
        ) : null}

        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={17} color={colors.marineDeep} />
          <Text style={styles.noticeText}>
            {bySms
              ? "قد تتأخّر الرسالة دقيقة. تأكّد من أن الرقم الذي كتبته هو رقمك."
              : "لم يصل شيء؟ تحقّق من مجلد الرسائل غير المرغوبة (Spam)، وتأكّد من صحّة البريد."}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.xl, paddingTop: spacing.xxl, gap: spacing.lg },
  back: { alignSelf: "flex-start" },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.infoSoft,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  head: { gap: spacing.xs },
  title: { ...typography.h1, textAlign: "center" },
  subtitle: { ...typography.bodyMuted, lineHeight: 23, textAlign: "center" },
  destination: { ...typography.body, color: colors.textPrimary },
  submit: { marginTop: spacing.sm },
  wait: { ...typography.caption, textAlign: "center" },
  resend: { ...typography.body, color: colors.marineDeep, textAlign: "center" },
  notice: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.infoSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  noticeText: { ...typography.caption, flex: 1, fontSize: 11.5, lineHeight: 18 },
  demo: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  demoText: {
    ...typography.caption,
    flex: 1,
    fontSize: 11.5,
    lineHeight: 18,
    color: colors.danger,
  },
});
