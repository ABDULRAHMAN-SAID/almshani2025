import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";
import { useRefreshNotifications } from "@/hooks/useNotifications";
import { sendNotification } from "@/services/adminService";
import { showToast } from "@/store/toastStore";

export default function SendNotificationScreen() {
  const refresh = useRefreshNotifications();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const canSend = title.trim().length > 3 && body.trim().length > 5;

  const handleSend = async () => {
    setSending(true);
    try {
      await sendNotification(title.trim(), body.trim());
      refresh();
      showToast("تم إرسال الإشعار", "success");
      router.back();
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="إرسال إشعار" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>عنوان الإشعار</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="مثال: تذكير بمحاضرة الغد"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          textAlign="right"
        />

        <Text style={styles.label}>نص الإشعار</Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="النص الذي يظهر داخل مركز الإشعارات"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.multiline]}
          multiline
          textAlign="right"
        />

        <Text style={styles.previewLabel}>معاينة</Text>
        <View style={styles.preview}>
          <View style={styles.previewIcon}>
            <Ionicons name="notifications-outline" size={17} color={colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.previewTitle}>{title.trim() || "عنوان الإشعار"}</Text>
            <Text style={styles.previewBody}>{body.trim() || "نص الإشعار كما سيصل للمستخدم"}</Text>
          </View>
        </View>

        <PrimaryButton
          label="إرسال للجميع"
          onPress={handleSend}
          loading={sending}
          disabled={!canSend}
          style={{ marginTop: spacing.lg }}
        />
        <Text style={styles.note}>
          يصل الإشعار إلى مركز الإشعارات داخل التطبيق. عند تفعيل Firebase Cloud Messaging سيصل أيضًا
          كإشعار على الهاتف.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl },
  label: { ...typography.h3, fontSize: 14, marginBottom: spacing.sm, marginTop: spacing.md },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 50,
  },
  multiline: { height: 110, paddingTop: spacing.md, textAlignVertical: "top" },
  previewLabel: { ...typography.caption, marginTop: spacing.lg, marginBottom: spacing.sm },
  preview: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  previewIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  previewTitle: { ...typography.body, fontFamily: "Tajawal_500Medium" },
  previewBody: { ...typography.bodyMuted },
  note: { ...typography.caption, lineHeight: 20, marginTop: spacing.lg, textAlign: "center" },
});
