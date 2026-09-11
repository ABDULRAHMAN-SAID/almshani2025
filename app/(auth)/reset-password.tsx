import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import { FormField } from "@/components/FormField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { colors, radius, spacing, typography } from "@/constants";
import { changePassword, openRecoverySession } from "@/services/authService";
import { showToast } from "@/store/toastStore";
import { toArabicMessage } from "@/utils/errors";

const MIN_PASSWORD = 6;

/**
 * الشاشة التي يهبط فيها رابط الاستعادة القادم في البريد.
 *
 * الرابط يفتح التطبيق بمخطّطه الخاص ويحمل معه جلسة مؤقّتة، فنفتحها أولًا ثم
 * نسمح بتعيين كلمة المرور. ولو وصل المستخدم إلى هذه الشاشة بلا رابط صالح
 * أوقفناه برسالة صريحة بدل نموذجٍ يبدو صالحًا ثم يفشل عند الحفظ.
 */
export default function ResetPasswordScreen() {
  const [stage, setStage] = useState<"opening" | "ready" | "invalid">("opening");
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const open = async (url: string | null) => {
      if (!url) {
        if (!cancelled) {
          setReason("افتح الرابط من رسالة البريد مباشرةً على هذا الهاتف.");
          setStage("invalid");
        }
        return;
      }
      try {
        await openRecoverySession(url);
        if (!cancelled) setStage("ready");
      } catch (error) {
        if (!cancelled) {
          setReason(toArabicMessage(error, "الرابط غير صالح"));
          setStage("invalid");
        }
      }
    };

    // الرابط الذي فتح التطبيق، أو الذي يصل وهو مفتوح بالفعل.
    Linking.getInitialURL().then(open);
    const subscription = Linking.addEventListener("url", (event) => open(event.url));
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  const error =
    password.length < MIN_PASSWORD
      ? `${MIN_PASSWORD} أحرف على الأقل`
      : confirm !== password
        ? "كلمتا المرور غير متطابقتين"
        : "";

  const handleSave = async () => {
    if (error) {
      showToast(error, "error");
      return;
    }
    setSaving(true);
    try {
      await changePassword(password);
      showToast("تم تغيير كلمة المرور", "success");
      router.replace("/(auth)/login");
    } catch (caught) {
      showToast(toArabicMessage(caught, "تعذّر تغيير كلمة المرور"), "error");
    } finally {
      setSaving(false);
    }
  };

  if (stage === "opening") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.note}>نفتح الرابط...</Text>
      </View>
    );
  }

  if (stage === "invalid") {
    return (
      <View style={styles.center}>
        <View style={styles.badIcon}>
          <Ionicons name="link-outline" size={28} color={colors.danger} />
        </View>
        <Text style={styles.title}>الرابط لم يعد صالحًا</Text>
        <Text style={styles.body}>{reason}</Text>
        <PrimaryButton
          label="اطلب رابطًا جديدًا"
          onPress={() => router.replace("/(auth)/forgot-password")}
          style={styles.submit}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.head}>
          <Text style={styles.title}>كلمة مرور جديدة</Text>
          <Text style={styles.subtitle}>اخترها الآن، وستدخل بها في المرة القادمة.</Text>
        </View>

        <FormField
          label="كلمة المرور الجديدة"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secure
          autoCapitalize="none"
          hint={`${MIN_PASSWORD} أحرف على الأقل`}
        />
        <FormField
          label="تأكيد كلمة المرور"
          value={confirm}
          onChangeText={setConfirm}
          placeholder="••••••••"
          secure
          autoCapitalize="none"
          error={confirm && confirm !== password ? "كلمتا المرور غير متطابقتين" : ""}
          onSubmitEditing={handleSave}
          returnKeyType="go"
        />

        <PrimaryButton label="حفظ" onPress={handleSave} loading={saving} style={styles.submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  head: { gap: spacing.xs, marginBottom: spacing.sm },
  title: { ...typography.h1, textAlign: "center" },
  subtitle: { ...typography.bodyMuted, textAlign: "center" },
  body: { ...typography.body, textAlign: "center", lineHeight: 24, color: colors.textSecondary },
  note: { ...typography.caption },
  badIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  submit: { marginTop: spacing.lg, alignSelf: "stretch" },
});
