import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { AttachmentList } from "@/components/AttachmentList";
import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { QueryState } from "@/components/QueryState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { fetchMyMessages } from "@/services/messageService";
import type { MessageStatus, UserMessage } from "@/types/models";

const STATUS_LABEL: Record<MessageStatus, string> = {
  new: "قيد الاستلام",
  read: "اطّلعت عليها الإدارة",
  answered: "تم الرد",
};

const STATUS_COLOR: Record<MessageStatus, string> = {
  new: colors.textMuted,
  read: colors.marineDeep,
  answered: colors.success,
};

export default function MyMessagesScreen() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["messages", "mine", user?.id],
    queryFn: () => fetchMyMessages(user?.id ?? ""),
    enabled: Boolean(user),
  });

  const messages = query.data ?? [];

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="رسائلي"
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="كتابة رسالة جديدة"
            onPress={() => router.push("/compose")}
            hitSlop={8}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </Pressable>
        }
      />
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={query.refetch}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {messages.length === 0 ? (
            <>
              <EmptyState
                icon="mail-outline"
                title="لا توجد رسائل بعد"
                subtitle="اكتب اقتراحًا أو طلبًا أو استفسارًا وسيصلك رد الإدارة هنا."
              />
              <PrimaryButton label="اكتب رسالة" onPress={() => router.push("/compose")} />
            </>
          ) : (
            messages.map((message) => <MessageCard key={message.id} message={message} />)
          )}
        </ScrollView>
      </QueryState>
    </View>
  );
}

function MessageCard({ message }: { message: UserMessage }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.kindTag}>
          <Text style={styles.kindText}>{message.kind}</Text>
        </View>
        <Text style={styles.date}>{message.createdAt}</Text>
      </View>

      <Text style={styles.subject}>{message.subject}</Text>
      <Text style={styles.body}>{message.body}</Text>

      <AttachmentList attachments={message.attachments} />

      <View style={styles.statusRow}>
        <View style={[styles.dot, { backgroundColor: STATUS_COLOR[message.status] }]} />
        <Text style={[styles.status, { color: STATUS_COLOR[message.status] }]}>
          {STATUS_LABEL[message.status]}
        </Text>
      </View>

      {message.reply ? (
        <View style={styles.reply}>
          <View style={styles.replyHead}>
            <Ionicons name="return-down-back-outline" size={15} color={colors.success} />
            <Text style={styles.replyTitle}>رد قسم الأنشطة</Text>
            <Text style={styles.date}>{message.reply.repliedAt}</Text>
          </View>
          <Text style={styles.replyBody}>{message.reply.body}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kindTag: {
    backgroundColor: colors.infoSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
  kindText: { fontFamily: "Tajawal_500Medium", fontSize: 12, color: colors.marineDeep },
  date: { ...typography.caption, fontSize: 11 },
  subject: { ...typography.h3, fontSize: 15, marginTop: spacing.sm },
  body: { ...typography.body, fontSize: 13, lineHeight: 22, marginTop: spacing.xs, color: colors.textSecondary },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md },
  dot: { width: 7, height: 7, borderRadius: 4 },
  status: { fontFamily: "Tajawal_500Medium", fontSize: 12 },
  reply: {
    marginTop: spacing.md,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  replyHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  replyTitle: { fontFamily: "Tajawal_700Bold", fontSize: 12, color: colors.success, flex: 1 },
  replyBody: { ...typography.body, fontSize: 13, lineHeight: 22, marginTop: spacing.xs },
});
