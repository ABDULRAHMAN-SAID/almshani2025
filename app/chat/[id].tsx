import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BottomSheet } from "@/components/BottomSheet";
import { ChatVoice } from "@/components/ChatVoice";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SecondaryButton } from "@/components/SecondaryButton";
import { colors, radius, spacing, typography, themed } from "@/constants";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useAuth } from "@/hooks/useAuth";
import {
  deleteMessage,
  fetchMessages,
  leaveConversation,
  markConversationRead,
  reportMessage,
  sendMessage,
  sendVoiceMessage,
} from "@/services/chatService";
import type { ChatMessage } from "@/services/chatService";
import { type PickedMedia, formatDuration } from "@/services/uploadService";
import { showToast } from "@/store/toastStore";
import { toArabicMessage } from "@/utils/errors";

/** "4:05 م" — وقت الرسالة كما يُقرأ في المحادثات. */
function clock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hour = d.getHours();
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(d.getMinutes()).padStart(2, "0")} ${hour < 12 ? "ص" : "م"}`;
}

/**
 * محادثة واحدة.
 *
 * تُسأل كل أربع ثوانٍ ما دامت مفتوحة — لا اشتراك لحظيّ: الاشتراك يفتح قناة
 * دائمة تستهلك البطارية وتنقطع مع الشبكة فتحتاج إعادة وصلٍ ومنطقَ إعادة،
 * وأربع ثوانٍ في محادثة نصّية لا تُلحظ.
 *
 * ولا تعديل لرسالة بعد إرسالها، وحذفُها لكاتبها وحده: رسالةٌ تُقرأ ثم تُبدَّل
 * تُنكر على قارئها ما قرأ.
 *
 * والتسجيل الصوتي بضغطةٍ تبدأه وضغطةٍ ترسله، لا بإمساكٍ مستمرّ: الإمساك يُتعب
 * الإبهام في تسجيلٍ طويل، ويسقط التسجيل إن انزلق الإصبع إلى الشاشة التي
 * تتمرّر. والمايك يحلّ محلّ زرّ الإرسال ما دام الحقل فارغًا، كما اعتاد الناس.
 */
export default function ChatScreen() {
  const params = useLocalSearchParams<{ id?: string; title?: string }>();
  const conversationId = (params.id ?? "").trim();
  const client = useQueryClient();
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const [picked, setPicked] = useState<ChatMessage | null>(null);
  const [askLeave, setAskLeave] = useState(false);
  const scroller = useRef<ScrollView>(null);

  const messages = useQuery({
    queryKey: ["messages", conversationId],
    enabled: conversationId.length > 0,
    queryFn: () => fetchMessages(conversationId),
    refetchInterval: 4_000,
  });

  // تُعلَّم مقروءة عند الفتح وعند كل وصول جديد، فلا يبقى العدّاد أحمر وهو مقروء.
  useEffect(() => {
    if (!conversationId) return;
    void markConversationRead(conversationId).then(() =>
      client.invalidateQueries({ queryKey: ["conversations"] })
    );
  }, [conversationId, client, messages.data?.length]);

  const send = useMutation({
    mutationFn: (text: string) => sendMessage(conversationId, text),
    onSuccess: () => {
      setDraft("");
      void messages.refetch();
      void client.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e) => showToast(toArabicMessage(e, "تعذّر الإرسال"), "error"),
  });

  const voice = useMutation({
    mutationFn: (media: PickedMedia) => sendVoiceMessage(conversationId, media),
    onSuccess: () => {
      void messages.refetch();
      void client.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e) => showToast(toArabicMessage(e, "تعذّر إرسال التسجيل"), "error"),
  });

  const recorder = useAudioRecorder({ onRecorded: (media) => voice.mutate(media) });

  const startRecording = async () => {
    try {
      await recorder.start();
    } catch (e) {
      showToast(toArabicMessage(e, "تعذّر بدء التسجيل"), "error");
    }
  };

  const finishRecording = async () => {
    // الهوك يتجاهل ما دون ٧٠٠ مللي ثانية بصمت؛ والمستخدم يستحقّ أن يعرف.
    const tooShort = recorder.elapsedMs < 700;
    await recorder.stop();
    if (tooShort) showToast("التسجيل قصير جدًا — سجّل أطول قليلًا", "error");
  };

  const remove = useMutation({
    mutationFn: (id: string) => deleteMessage(id),
    onSuccess: () => {
      setPicked(null);
      void messages.refetch();
      showToast("حُذفت الرسالة", "success");
    },
    onError: (e) => {
      setPicked(null);
      showToast(toArabicMessage(e, "تعذّر الحذف"), "error");
    },
  });

  const report = useMutation({
    mutationFn: (id: string) => reportMessage(id, "إساءة"),
    onSuccess: () => {
      setPicked(null);
      showToast("أُرسل البلاغ إلى الإدارة", "success");
    },
    onError: (e) => {
      setPicked(null);
      showToast(toArabicMessage(e, "تعذّر البلاغ"), "error");
    },
  });

  const leave = useMutation({
    mutationFn: () => leaveConversation(conversationId),
    onSuccess: () => {
      void client.invalidateQueries();
      router.back();
    },
    onError: (e) => showToast(toArabicMessage(e, "تعذّر الخروج"), "error"),
  });

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenHeader title={params.title || "محادثة"} />

      <ScrollView
        ref={scroller}
        style={styles.fill}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}
      >
        {(messages.data ?? []).length === 0 ? (
          <Text style={styles.empty}>لا رسائل بعد — اكتب أول رسالة.</Text>
        ) : (
          (messages.data ?? []).map((message) => {
            // "me" هو مرسل النسخة التجريبية: بلا خادم لا يُعرف معرّف صاحب
            // الجهاز، وبدونه تظهر رسائله كأنها من غيره.
            const mine = message.senderId === user?.id || message.senderId === "me";
            return (
              <Pressable
                key={message.id}
                accessibilityRole="button"
                accessibilityLabel="خيارات الرسالة"
                onLongPress={() => setPicked(message)}
                delayLongPress={350}
                style={[styles.bubbleWrap, mine ? styles.mineWrap : styles.theirsWrap]}
              >
                <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                  {!mine && message.senderName ? (
                    <Text style={styles.sender}>{message.senderName}</Text>
                  ) : null}
                  {message.audio ? (
                    <ChatVoice
                      url={message.audio.url}
                      durationMs={message.audio.durationMs}
                      mine={mine}
                    />
                  ) : null}
                  {message.body ? (
                    <Text style={[styles.body, mine && styles.bodyMine]}>{message.body}</Text>
                  ) : null}
                  <Text style={[styles.time, mine && styles.timeMine]}>
                    {clock(message.createdAt)}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {recorder.isRecording ? (
        <View style={styles.composer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="إلغاء التسجيل"
            onPress={() => void recorder.cancel()}
            style={styles.composerIcon}
          >
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </Pressable>
          <View style={styles.recording}>
            <View style={styles.pulse} />
            <Text style={styles.recordingText}>جارٍ التسجيل — {formatDuration(recorder.elapsedMs)}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="إرسال التسجيل"
            onPress={() => void finishRecording()}
            style={styles.sendButton}
          >
            <Ionicons name="send" size={18} color={colors.textOnPrimary} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.composer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="خيارات المحادثة"
            onPress={() => setAskLeave(true)}
            style={styles.composerIcon}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
          </Pressable>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="اكتب رسالة"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            textAlign="right"
            multiline
          />
          {draft.trim().length === 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="تسجيل رسالة صوتية"
              disabled={voice.isPending}
              onPress={() => void startRecording()}
              style={styles.sendButton}
            >
              {voice.isPending ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <Ionicons name="mic" size={20} color={colors.textOnPrimary} />
              )}
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="إرسال"
              disabled={send.isPending}
              onPress={() => send.mutate(draft)}
              style={styles.sendButton}
            >
              <Ionicons name="send" size={18} color={colors.textOnPrimary} />
            </Pressable>
          )}
        </View>
      )}

      <BottomSheet visible={Boolean(picked)} onClose={() => setPicked(null)}>
        <Text style={styles.sheetTitle}>الرسالة</Text>
        <Text style={styles.sheetBody} numberOfLines={3}>
          {picked?.body || (picked?.audio ? "رسالة صوتية" : "")}
        </Text>
        {picked?.senderId === user?.id ? (
          <PrimaryButton
            label="احذف رسالتي"
            onPress={() => picked && remove.mutate(picked.id)}
            loading={remove.isPending}
            style={{ marginTop: spacing.lg, backgroundColor: colors.danger }}
          />
        ) : (
          <PrimaryButton
            label="أبلغ الإدارة عن هذه الرسالة"
            onPress={() => picked && report.mutate(picked.id)}
            loading={report.isPending}
            style={{ marginTop: spacing.lg, backgroundColor: colors.danger }}
          />
        )}
        <SecondaryButton
          label="إغلاق"
          onPress={() => setPicked(null)}
          style={{ marginTop: spacing.sm }}
        />
      </BottomSheet>

      <BottomSheet visible={askLeave} onClose={() => setAskLeave(false)}>
        <Text style={styles.sheetTitle}>الخروج من المحادثة</Text>
        <Text style={styles.sheetBody}>
          تخرج منها فلا تصلك رسائلها. ويمكن أن تُضاف إليها مرّة أخرى.
        </Text>
        <PrimaryButton
          label="اخرج"
          onPress={() => leave.mutate()}
          loading={leave.isPending}
          style={{ marginTop: spacing.lg, backgroundColor: colors.danger }}
        />
        <SecondaryButton
          label="تراجع"
          onPress={() => setAskLeave(false)}
          style={{ marginTop: spacing.sm }}
        />
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

const styles = themed(() => ({
  screen: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.lg },
  empty: { ...typography.caption, textAlign: "center", marginTop: spacing.xxl },
  bubbleWrap: { maxWidth: "82%" },
  mineWrap: { alignSelf: "flex-start" },
  theirsWrap: { alignSelf: "flex-end" },
  bubble: { borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 2 },
  mine: { backgroundColor: colors.primary, borderBottomLeftRadius: 4 },
  theirs: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomRightRadius: 4,
  },
  sender: { ...typography.caption, fontSize: 11, color: colors.accent },
  body: { ...typography.body, fontSize: 14, lineHeight: 22 },
  bodyMine: { color: colors.textOnPrimary },
  time: { ...typography.caption, fontSize: 10, textAlign: "left" },
  timeMine: { color: "rgba(255,255,255,0.7)" },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  composerIcon: { padding: spacing.sm },
  input: {
    flex: 1,
    maxHeight: 110,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: "Tajawal_400Regular",
    fontSize: 14,
    color: colors.textPrimary,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  recording: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 42,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
  recordingText: { ...typography.body, fontSize: 14, color: colors.textPrimary },
  sheetTitle: { ...typography.h2, textAlign: "center" },
  sheetBody: { ...typography.bodyMuted, textAlign: "center", marginTop: spacing.sm, lineHeight: 22 },
}));
