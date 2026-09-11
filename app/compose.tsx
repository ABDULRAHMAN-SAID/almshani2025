import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { MediaField } from "@/components/MediaField";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/EmptyState";
import { sendMessage } from "@/services/messageService";
import { showToast } from "@/store/toastStore";
import type { MediaAttachment, MessageKind } from "@/types/models";
import { toArabicMessage } from "@/utils/errors";
import { useFeatures } from "@/hooks/useFeatures";

const KINDS: { key: MessageKind; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "اقتراح", icon: "bulb-outline" },
  { key: "طلب", icon: "clipboard-outline" },
  { key: "استفسار", icon: "help-circle-outline" },
  { key: "ملاحظة", icon: "chatbox-ellipses-outline" },
];

const MAX_BODY = 1200;

export default function ComposeScreen() {
  const { user } = useAuth();
  const client = useQueryClient();
  const [kind, setKind] = useState<MessageKind>("اقتراح");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const { messagesEnabled } = useFeatures();

  const canSend = subject.trim().length > 2 && body.trim().length > 9;

  const handleSend = async () => {
    if (!user) {
      showToast("سجّل الدخول أولًا", "error");
      return;
    }
    setSending(true);
    try {
      await sendMessage({
        userId: user.id,
        userName: user.name,
        kind,
        subject: subject.trim(),
        body: body.trim(),
        attachments,
      });
      await client.invalidateQueries({ queryKey: ["messages"] });
      showToast("تم إرسال رسالتك إلى الإدارة", "success");
      router.replace("/my-messages");
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر إرسال الرسالة، حاول مرة أخرى"), "error");
    } finally {
      setSending(false);
    }
  };

  if (!messagesEnabled) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="مراسلة الإدارة" />
        <EmptyState
          icon="lock-closed-outline"
          title="المراسلة موقوفة حاليًا"
          subtitle="أوقفت الإدارة استقبال الرسائل مؤقتًا. استخدم أرقام التواصل في شاشة «تواصل معنا»."
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={12}
    >
      <ScreenHeader
        title="مراسلة الإدارة"
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="رسائلي السابقة"
            onPress={() => router.push("/my-messages")}
            hitSlop={8}
          >
            <Ionicons name="albums-outline" size={20} color={colors.primary} />
          </Pressable>
        }
      />
      <OfflineBanner />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>نوع الرسالة</Text>
        <View style={styles.chipWrap}>
          {KINDS.map((option) => {
            const active = option.key === kind;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                onPress={() => setKind(option.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Ionicons
                  name={option.icon}
                  size={15}
                  color={active ? colors.textOnPrimary : colors.textMuted}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.key}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>الموضوع</Text>
        <TextInput
          value={subject}
          onChangeText={setSubject}
          placeholder="مثال: اقتراح نشاط رياضي جديد"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          maxLength={90}
          textAlign="right"
        />

        <View style={styles.bodyHead}>
          <Text style={styles.label}>نص الرسالة</Text>
          <Text style={styles.counter}>
            {body.length} / {MAX_BODY}
          </Text>
        </View>
        <TextInput
          value={body}
          onChangeText={(text) => setBody(text.slice(0, MAX_BODY))}
          placeholder="اكتب رسالتك بوضوح…"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.multiline]}
          multiline
          textAlign="right"
        />

        <MediaField
          label="مرفقات (اختياري)"
          hint="صورة أو مقطع فيديو أو تسجيل صوتي أو ملف يوضّح رسالتك."
          value={attachments}
          onChange={setAttachments}
          folder="messages"
        />

        <View style={styles.notice}>
          <Ionicons name="shield-half-outline" size={17} color={colors.warning} />
          <Text style={styles.noticeText}>
            لا ترفق أي صورة أو معلومة تخصّ المواقع أو الأعمال التشغيلية. الرسائل تصل إلى قسم الأنشطة فقط.
          </Text>
        </View>

        <PrimaryButton
          label="إرسال إلى الإدارة"
          onPress={handleSend}
          loading={sending}
          disabled={!canSend}
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl },
  label: { ...typography.h3, fontSize: 14, marginBottom: spacing.sm, marginTop: spacing.md },
  bodyHead: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  counter: { ...typography.caption, fontSize: 11, marginBottom: spacing.sm },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 50,
  },
  multiline: { height: 160, paddingTop: spacing.md, textAlignVertical: "top" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: colors.textMuted },
  chipTextActive: { color: colors.textOnPrimary },
  notice: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  noticeText: { ...typography.caption, flex: 1, lineHeight: 20, color: colors.textSecondary },
});
