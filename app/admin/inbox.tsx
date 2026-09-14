import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AttachmentList } from "@/components/AttachmentList";
import { BottomSheet } from "@/components/BottomSheet";
import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { QueryState } from "@/components/QueryState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SecondaryButton } from "@/components/SecondaryButton";
import { colors, radius, spacing, typography } from "@/constants";
import { deleteMessage, fetchAllMessages, markMessageRead, replyToMessage } from "@/services/messageService";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { showToast } from "@/store/toastStore";
import type { MessageStatus, UserMessage } from "@/types/models";
import { toArabicMessage } from "@/utils/errors";

const FILTERS: { key: "all" | MessageStatus; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "new", label: "جديدة" },
  { key: "read", label: "مقروءة" },
  { key: "answered", label: "تم الرد" },
];

export default function AdminInboxScreen() {
  const client = useQueryClient();
  const logAction = useAdminSettingsStore((state) => state.logAction);
  const [filter, setFilter] = useState<"all" | MessageStatus>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<UserMessage | null>(null);

  const query = useQuery({ queryKey: ["messages", "all"], queryFn: fetchAllMessages });
  const messages = query.data ?? [];
  const list = filter === "all" ? messages : messages.filter((message) => message.status === filter);
  const unread = messages.filter((message) => message.status === "new").length;

  const open = async (message: UserMessage) => {
    const next = openId === message.id ? null : message.id;
    setOpenId(next);
    setReplyDraft("");
    if (next && message.status === "new") {
      try {
        await markMessageRead(message.id);
        await client.invalidateQueries({ queryKey: ["messages"] });
      } catch (error) {
        showToast(toArabicMessage(error, "تعذّر تحديث حالة الرسالة"), "error");
      }
    }
  };

  const handleReply = async (message: UserMessage) => {
    setSending(true);
    try {
      await replyToMessage(message.id, replyDraft);
      await client.invalidateQueries({ queryKey: ["messages"] });
      logAction(`الرد على رسالة: ${message.subject}`);
      setReplyDraft("");
      showToast("تم إرسال الرد", "success");
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر إرسال الرد"), "error");
    } finally {
      setSending(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMessage(pendingDelete.id);
      await client.invalidateQueries({ queryKey: ["messages"] });
      logAction(`حذف رسالة: ${pendingDelete.subject}`);
      showToast("تم حذف الرسالة", "success");
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر حذف الرسالة"), "error");
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={unread > 0 ? `الرسائل الواردة (${unread} جديدة)` : "الرسائل الواردة"} />

      <View style={styles.filters}>
        {FILTERS.map((item) => {
          const active = item.key === filter;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              onPress={() => setFilter(item.key)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <QueryState isLoading={query.isLoading} error={query.error} onRetry={query.refetch}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {list.length === 0 ? (
            <EmptyState icon="mail-open-outline" title="لا توجد رسائل في هذا التصنيف" />
          ) : (
            list.map((message) => {
              const expanded = openId === message.id;
              return (
                <View key={message.id} style={styles.card}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void open(message)}
                    style={styles.cardHead}
                  >
                    {message.status === "new" ? <View style={styles.unreadDot} /> : null}
                    <View style={styles.headBody}>
                      <Text style={styles.subject} numberOfLines={expanded ? undefined : 1}>
                        {message.subject}
                      </Text>
                      <Text style={styles.meta}>
                        {message.userName} • {message.kind} • {message.createdAt}
                      </Text>
                    </View>
                    <Ionicons
                      name={expanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={colors.textMuted}
                    />
                  </Pressable>

                  {expanded ? (
                    <View style={styles.cardBody}>
                      <Text style={styles.body}>{message.body}</Text>
                      <AttachmentList attachments={message.attachments} />

                      {message.reply ? (
                        <View style={styles.reply}>
                          <Text style={styles.replyTitle}>الرد المرسل — {message.reply.repliedAt}</Text>
                          <Text style={styles.replyBody}>{message.reply.body}</Text>
                        </View>
                      ) : null}

                      <Text style={styles.label}>{message.reply ? "تعديل الرد" : "اكتب الرد"}</Text>
                      <TextInput
                        value={replyDraft}
                        onChangeText={setReplyDraft}
                        placeholder="نص الرد كما سيصل صاحب الرسالة"
                        placeholderTextColor={colors.textMuted}
                        style={[styles.input, styles.multiline]}
                        multiline
                        textAlign="right"
                      />

                      <View style={styles.actions}>
                        <PrimaryButton
                          label="إرسال الرد"
                          onPress={() => void handleReply(message)}
                          loading={sending}
                          disabled={replyDraft.trim().length < 2}
                          style={{ flex: 1 }}
                        />
                        <SecondaryButton
                          label="حذف"
                          onPress={() => setPendingDelete(message)}
                          textColor={colors.danger}
                          style={styles.deleteButton}
                        />
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      </QueryState>

      <BottomSheet visible={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)}>
        <Text style={styles.sheetTitle}>حذف الرسالة</Text>
        <Text style={styles.sheetBody}>
          سيُحذف «{pendingDelete?.subject}» نهائيًا مع مرفقاتها ولن يمكن استرجاعها.
        </Text>
        <PrimaryButton label="تأكيد الحذف" onPress={confirmDelete} style={{ marginTop: spacing.lg }} />
        <SecondaryButton
          label="إلغاء"
          onPress={() => setPendingDelete(null)}
          style={{ marginTop: spacing.sm }}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  filters: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: "Tajawal_500Medium", fontSize: 12, color: colors.textMuted },
  chipTextActive: { color: colors.textOnPrimary },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  headBody: { flex: 1, gap: 2 },
  subject: { ...typography.body, fontSize: 14, fontFamily: "Tajawal_500Medium" },
  meta: { ...typography.caption, fontSize: 11 },
  cardBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  body: { ...typography.body, fontSize: 13, lineHeight: 22, color: colors.textSecondary },
  reply: {
    marginTop: spacing.md,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  replyTitle: { fontFamily: "Tajawal_700Bold", fontSize: 12, color: colors.success },
  replyBody: { ...typography.body, fontSize: 13, lineHeight: 21, marginTop: 4 },
  label: { ...typography.h3, fontSize: 13, marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    ...typography.body,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  multiline: { height: 96, paddingTop: spacing.sm, textAlignVertical: "top" },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  deleteButton: { borderColor: colors.danger, paddingHorizontal: spacing.lg },
  sheetTitle: { ...typography.h2, textAlign: "center" },
  sheetBody: { ...typography.caption, textAlign: "center", marginTop: spacing.sm, lineHeight: 21 },
});
