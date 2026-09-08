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
import { useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AttachmentList } from "@/components/AttachmentList";
import { BottomSheet } from "@/components/BottomSheet";
import { EmptyState } from "@/components/EmptyState";
import { MediaField } from "@/components/MediaField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { QueryState } from "@/components/QueryState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SecondaryButton } from "@/components/SecondaryButton";
import { colors, radius, spacing, typography } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import {
  createPost,
  deletePost,
  fetchGroup,
  fetchPosts,
  reportPost,
  setPostPinned,
  updateGroup,
} from "@/services/groupService";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { useAdminStore } from "@/store/adminStore";
import { useRegistrationStore } from "@/store/registrationStore";
import { showToast } from "@/store/toastStore";
import type { GroupPost, MediaAttachment } from "@/types/models";
import { toArabicMessage } from "@/utils/errors";

const MAX_POST = 800;

const REPORT_REASONS = [
  "محتوى مخالف للضوابط",
  "معلومة تشغيلية أو موقع",
  "إساءة أو لغة غير لائقة",
  "خارج موضوع المجموعة",
];

export default function GroupBoardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = String(id ?? "");
  const client = useQueryClient();
  const { user } = useAuth();
  const isAdmin = useAdminStore((state) => state.isAdmin);
  const logAction = useAdminSettingsStore((state) => state.logAction);
  const registeredIds = useRegistrationStore((state) => state.registeredIds);

  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [posting, setPosting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<GroupPost | null>(null);
  const [reporting, setReporting] = useState<GroupPost | null>(null);

  const groupQuery = useQuery({
    queryKey: ["groups", groupId],
    queryFn: () => fetchGroup(groupId),
    enabled: Boolean(groupId),
  });
  const postsQuery = useQuery({
    queryKey: ["groups", groupId, "posts"],
    queryFn: () => fetchPosts(groupId),
    enabled: Boolean(groupId),
  });

  const group = groupQuery.data;
  const posts = postsQuery.data ?? [];

  const restricted =
    group?.audience === "registered" && group.activityId
      ? !registeredIds.includes(group.activityId)
      : false;
  const canPost = Boolean(group) && !group?.locked && !restricted;

  const refresh = () => client.invalidateQueries({ queryKey: ["groups"] });

  const handlePost = async () => {
    if (!user || !group) return;
    setPosting(true);
    try {
      await createPost({
        groupId: group.id,
        authorId: user.id,
        authorName: user.name,
        body: body.trim(),
        attachments,
      });
      setBody("");
      setAttachments([]);
      await refresh();
      showToast("تمت إضافة مشاركتك", "success");
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر نشر المشاركة"), "error");
    } finally {
      setPosting(false);
    }
  };

  const handleToggleLock = async () => {
    if (!group) return;
    try {
      await updateGroup(group.id, { locked: !group.locked });
      await refresh();
      logAction(`${group.locked ? "فتح" : "قفل"} مجموعة: ${group.title}`);
      showToast(group.locked ? "فُتحت المجموعة للنقاش" : "أُقفلت المجموعة", "success");
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر تغيير حالة المجموعة"), "error");
    }
  };

  const handlePin = async (post: GroupPost) => {
    try {
      await setPostPinned(post.id, !post.pinned);
      await refresh();
      showToast(post.pinned ? "أُلغي التثبيت" : "تم تثبيت المشاركة", "success");
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر تثبيت المشاركة"), "error");
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deletePost(pendingDelete.id);
      await refresh();
      if (isAdmin) logAction(`حذف مشاركة في مجموعة: ${group?.title ?? ""}`);
      showToast("تم حذف المشاركة", "success");
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر حذف المشاركة"), "error");
    } finally {
      setPendingDelete(null);
    }
  };

  const submitReport = async (reason: string) => {
    if (!reporting) return;
    try {
      await reportPost(reporting.id, reason);
      await refresh();
      showToast("وصل بلاغك إلى الإدارة", "success");
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر إرسال البلاغ"), "error");
    } finally {
      setReporting(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={12}
    >
      <ScreenHeader
        title={group?.title ?? "المجموعة"}
        action={
          isAdmin && group ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={group.locked ? "فتح المجموعة" : "قفل المجموعة"}
              onPress={() => void handleToggleLock()}
              hitSlop={8}
            >
              <Ionicons
                name={group.locked ? "lock-closed" : "lock-open-outline"}
                size={20}
                color={group.locked ? colors.warning : colors.primary}
              />
            </Pressable>
          ) : undefined
        }
      />

      <QueryState
        isLoading={groupQuery.isLoading || postsQuery.isLoading}
        error={groupQuery.error ?? postsQuery.error}
        onRetry={() => {
          void groupQuery.refetch();
          void postsQuery.refetch();
        }}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {group ? (
            <View style={styles.intro}>
              <Text style={styles.topic}>{group.topic}</Text>
              <Text style={styles.description}>{group.description}</Text>
            </View>
          ) : null}

          {group?.locked ? (
            <View style={[styles.banner, { backgroundColor: colors.warningSoft }]}>
              <Ionicons name="lock-closed-outline" size={17} color={colors.warning} />
              <Text style={styles.bannerText}>
                المجموعة مقفلة للقراءة فقط. أقفلتها الإدارة ولا يمكن إضافة مشاركات جديدة.
              </Text>
            </View>
          ) : null}

          {restricted ? (
            <View style={[styles.banner, { backgroundColor: colors.infoSoft }]}>
              <Ionicons name="information-circle-outline" size={17} color={colors.marineDeep} />
              <Text style={styles.bannerText}>
                هذه المجموعة للمسجّلين في النشاط المرتبط بها. يمكنك القراءة، وتظهر لك الكتابة بعد التسجيل.
              </Text>
            </View>
          ) : null}

          {canPost ? (
            <View style={styles.composer}>
              <TextInput
                value={body}
                onChangeText={(text) => setBody(text.slice(0, MAX_POST))}
                placeholder="اكتب مشاركتك في النقاش…"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                multiline
                textAlign="right"
              />
              <MediaField
                value={attachments}
                onChange={setAttachments}
                folder="posts"
                max={2}
                hint="يمكنك إرفاق صورة أو مقطع فيديو أو تسجيل صوتي أو ملف."
              />
              <PrimaryButton
                label="نشر المشاركة"
                onPress={handlePost}
                loading={posting}
                disabled={body.trim().length < 3}
              />
            </View>
          ) : null}

          {posts.length === 0 ? (
            <EmptyState
              icon="chatbox-ellipses-outline"
              title="لا توجد مشاركات بعد"
              subtitle={canPost ? "كن أول من يكتب في هذا النقاش." : undefined}
            />
          ) : (
            posts.map((post) => {
              const mine = post.authorId === user?.id;
              return (
                <View key={post.id} style={[styles.post, post.pinned && styles.postPinned]}>
                  <View style={styles.postHead}>
                    <View style={styles.avatar}>
                      <Ionicons name="person" size={15} color={colors.primary} />
                    </View>
                    <View style={styles.postMeta}>
                      <Text style={styles.author}>{post.authorName}</Text>
                      <Text style={styles.date}>{post.createdAt}</Text>
                    </View>
                    {post.pinned ? (
                      <View style={styles.pinTag}>
                        <Ionicons name="pin" size={11} color={colors.gold} />
                        <Text style={styles.pinText}>مثبّتة</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.postBody}>{post.body}</Text>
                  <AttachmentList attachments={post.attachments} />

                  <View style={styles.postActions}>
                    {isAdmin ? (
                      <PostAction
                        icon={post.pinned ? "pin" : "pin-outline"}
                        label={post.pinned ? "إلغاء التثبيت" : "تثبيت"}
                        onPress={() => void handlePin(post)}
                      />
                    ) : null}
                    {mine || isAdmin ? (
                      <PostAction
                        icon="trash-outline"
                        label="حذف"
                        tint={colors.danger}
                        onPress={() => setPendingDelete(post)}
                      />
                    ) : null}
                    {!mine ? (
                      <PostAction icon="flag-outline" label="إبلاغ" onPress={() => setReporting(post)} />
                    ) : null}
                    {isAdmin && post.reportCount > 0 ? (
                      <Text style={styles.reportCount}>{post.reportCount} بلاغ</Text>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </QueryState>

      <BottomSheet visible={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)}>
        <Text style={styles.sheetTitle}>حذف المشاركة</Text>
        <Text style={styles.sheetBody}>ستُحذف المشاركة ومرفقاتها نهائيًا.</Text>
        <PrimaryButton label="تأكيد الحذف" onPress={confirmDelete} style={{ marginTop: spacing.lg }} />
        <SecondaryButton
          label="إلغاء"
          onPress={() => setPendingDelete(null)}
          style={{ marginTop: spacing.sm }}
        />
      </BottomSheet>

      <BottomSheet visible={Boolean(reporting)} onClose={() => setReporting(null)}>
        <Text style={styles.sheetTitle}>الإبلاغ عن مشاركة</Text>
        <Text style={styles.sheetBody}>اختر سبب البلاغ؛ تصل المراجعة إلى الإدارة وحدها.</Text>
        <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
          {REPORT_REASONS.map((reason) => (
            <Pressable
              key={reason}
              accessibilityRole="button"
              onPress={() => void submitReport(reason)}
              style={({ pressed }) => [styles.reasonRow, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="flag-outline" size={16} color={colors.warning} />
              <Text style={styles.reasonText}>{reason}</Text>
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

function PostAction({
  icon,
  label,
  tint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}
      hitSlop={6}
    >
      <Ionicons name={icon} size={15} color={tint ?? colors.textMuted} />
      <Text style={[styles.actionLabel, tint ? { color: tint } : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl, gap: spacing.md },
  intro: { gap: 4 },
  topic: { ...typography.caption, fontSize: 11, color: colors.marineDeep },
  description: { ...typography.caption, lineHeight: 21 },
  banner: { flexDirection: "row", gap: spacing.sm, borderRadius: radius.md, padding: spacing.md },
  bannerText: { ...typography.caption, flex: 1, lineHeight: 20, color: colors.textSecondary },
  composer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  input: {
    ...typography.body,
    fontSize: 13,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: 96,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    textAlignVertical: "top",
  },
  post: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  postPinned: { borderColor: colors.gold, backgroundColor: colors.surfaceRaised },
  postHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  postMeta: { flex: 1, gap: 1 },
  author: { ...typography.body, fontSize: 13, fontFamily: "Tajawal_500Medium" },
  date: { ...typography.caption, fontSize: 11 },
  pinTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(184,145,47,0.14)",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  pinText: { fontFamily: "Tajawal_500Medium", fontSize: 10, color: colors.gold },
  postBody: { ...typography.body, fontSize: 13, lineHeight: 22, marginTop: spacing.sm },
  postActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  action: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionLabel: { ...typography.caption, fontSize: 11 },
  reportCount: { ...typography.caption, fontSize: 11, color: colors.danger, marginRight: "auto" },
  sheetTitle: { ...typography.h2, textAlign: "center" },
  sheetBody: { ...typography.caption, textAlign: "center", marginTop: spacing.sm, lineHeight: 21 },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  reasonText: { ...typography.body, fontSize: 13, flex: 1 },
});
