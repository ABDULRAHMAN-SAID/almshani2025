import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { FormField } from "@/components/FormField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { colors, radius, spacing, typography } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { isValidPhone, looksLikeEmail, signUpWithPassword } from "@/services/authService";
import { showToast } from "@/store/toastStore";
import { toArabicMessage } from "@/utils/errors";

const MIN_PASSWORD = 6;

/** شاشة إنشاء الحساب: الاسم ثلاثيًا، ورقم، وبريد، وكلمة مرور. */
export default function RegisterScreen() {
  const [firstName, setFirstName] = useState("");
  const [secondName, setSecondName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const { signIn } = useAuth();

  // نحسب الأخطاء دائمًا، ولا نعرضها إلا بعد أول محاولة إرسال — فلا تظهر
  // الشاشة حمراء قبل أن يكتب المستخدم حرفًا واحدًا.
  const errors = {
    firstName: firstName.trim() ? "" : "الاسم الأول مطلوب",
    familyName: familyName.trim() ? "" : "اسم العائلة مطلوب",
    phone: isValidPhone(phone) ? "" : "رقم غير صحيح — مثال: 91234567",
    email: looksLikeEmail(email) ? "" : "بريد غير صحيح",
    password: password.length >= MIN_PASSWORD ? "" : `${MIN_PASSWORD} أحرف على الأقل`,
    confirm: confirm === password ? "" : "كلمتا المرور غير متطابقتين",
  };
  const firstError = Object.values(errors).find(Boolean);
  const show = (key: keyof typeof errors) => (touched ? errors[key] : "");

  const handleSubmit = async () => {
    setTouched(true);
    if (firstError) {
      showToast(firstError, "error");
      return;
    }
    setLoading(true);
    try {
      const user = await signUpWithPassword({
        firstName,
        secondName,
        familyName,
        phone,
        email,
        password,
      });
      signIn(user);
      showToast("أهلًا بك", "success");
      router.replace("/(tabs)");
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر إنشاء الحساب"), "error");
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="رجوع"
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.back}
        >
          <Ionicons name="arrow-forward" size={22} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.head}>
          <Text style={styles.title}>إنشاء حساب</Text>
          <Text style={styles.subtitle}>اكتب اسمك كما هو في السجلّات الرسمية</Text>
        </View>

        <View style={styles.form}>
          <FormField
            label="الاسم الأول"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="عبدالله"
            error={show("firstName")}
          />
          <FormField
            label="الاسم الثاني"
            value={secondName}
            onChangeText={setSecondName}
            placeholder="سالم"
            hint="اسم الأب — اتركه فارغًا إن لم يكن جزءًا من اسمك"
          />
          <FormField
            label="اسم العائلة"
            value={familyName}
            onChangeText={setFamilyName}
            placeholder="الشحري"
            error={show("familyName")}
          />

          <View style={styles.divider} />

          <FormField
            label="رقم الهاتف"
            value={phone}
            onChangeText={setPhone}
            placeholder="91234567"
            keyboardType="phone-pad"
            error={show("phone")}
            hint={show("phone") ? undefined : "به تدخل التطبيق، ولا يظهر لأي مستخدم آخر"}
          />
          <FormField
            label="البريد الإلكتروني"
            value={email}
            onChangeText={setEmail}
            placeholder="name@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={show("email")}
            hint={show("email") ? undefined : "لاستعادة كلمة المرور إن نسيتها"}
          />

          <View style={styles.divider} />

          <FormField
            label="كلمة المرور"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secure
            autoCapitalize="none"
            error={show("password")}
            hint={show("password") ? undefined : `${MIN_PASSWORD} أحرف على الأقل`}
          />
          <FormField
            label="تأكيد كلمة المرور"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="••••••••"
            secure
            autoCapitalize="none"
            error={show("confirm")}
            onSubmitEditing={handleSubmit}
            returnKeyType="go"
          />

          <PrimaryButton
            label="إنشاء الحساب"
            onPress={handleSubmit}
            loading={loading}
            style={styles.submit}
          />

          <View style={styles.privacy}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
            <Text style={styles.privacyText}>
              لا يطلب التطبيق رتبة ولا رقمًا عسكريًا ولا جهة عمل، ولا يعرض رقمك ولا بريدك لأي
              مستخدم آخر.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>لديك حساب؟</Text>
          <Pressable accessibilityRole="link" onPress={() => router.replace("/(auth)/login")} hitSlop={8}>
            <Text style={styles.footerLink}>تسجيل الدخول</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingTop: spacing.xxl, gap: spacing.lg, paddingBottom: spacing.xxl },
  back: { alignSelf: "flex-start" },
  head: { gap: spacing.xs },
  title: { ...typography.h1 },
  subtitle: { ...typography.bodyMuted },
  form: { gap: spacing.md },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  submit: { marginTop: spacing.sm },
  privacy: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  privacyText: { ...typography.caption, flex: 1, fontSize: 11.5, lineHeight: 18 },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: spacing.xs },
  footerText: { ...typography.caption, fontSize: 13 },
  footerLink: { ...typography.caption, fontSize: 13, color: colors.marineDeep, fontFamily: "Tajawal_700Bold" },
});
