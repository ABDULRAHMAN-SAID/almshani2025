import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/EmptyState";
import { QueryState } from "@/components/QueryState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography, themed } from "@/constants";
import { fetchConversations, fetchFriendRequests } from "@/services/chatService";
import { relativeDayLabel } from "@/utils/date";

/**
 * محادثاتي.
 *
 * وتُحدَّث كل عشر ثوانٍ ما دامت الشاشة مفتوحة: الرسالة التي تصل ولا تظهر
 * حتى يُغلق التطبيق ويُفتح ليست رسالة وصلت.
 */
export default function ChatsScreen() {
  const conversations = useQuery({
    queryKey: ["conversations"],
    queryFn: fetchConversations,
    refetchInterval: 10_000,
  });
  const requests = useQuery({ queryKey: ["friend-requests"], queryFn: fetchFriendRequests });
  const pending = requests.data?.length ?? 0;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="المحادثات" />

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/friends")}
          style={styles.action}
        >
          <Ionicons name="people-outline" size={17} color={colors.primary} />
          <Text style={styles.actionText}>الأصدقاء</Text>
          {pending > 0 ? (
            <View style={styles.dot}>
              <Text style={styles.dotText}>{pending}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/new-group")}
          style={styles.action}
        >
          <Ionicons name="add-circle-outline" size={17} color={colors.primary} />
          <Text style={styles.actionText}>مجموعة جديدة</Text>
        </Pressable>
      </View>

      <QueryState
        isLoading={conversations.isLoading}
        error={conversations.error}
        onRetry={() => void conversations.refetch()}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {(conversations.data ?? []).length === 0 ? (
            <EmptyState
              icon="chatbubbles-outline"
              title="لا محادثات بعد"
              subtitle="أضف صديقًا من «الأصدقاء» ثم ابدأ محادثة."
            />
          ) : (
            (conversations.data ?? []).map((conversation) => (
              <Pressable
                key={conversation.id}
                accessibilityRole="button"
                accessibilityLabel={`محادثة ${conversation.title}`}
                onPress={() =>
                  router.push({
                    pathname: "/chat/[id]",
                    params: { id: conversation.id, title: conversation.title },
                  })
                }
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View style={[styles.avatar, conversation.kind === "group" && styles.avatarGroup]}>
                  <Ionicons
                    name={conversation.kind === "group" ? "people" : "person"}
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {conversation.title}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {conversation.lastMessage || "لا رسائل بعد"}
                  </Text>
                </View>
                <View style={styles.rowEnd}>
                  <Text style={styles.time}>
                    {conversation.lastMessageAt
                      ? relativeDayLabel(conversation.lastMessageAt.slice(0, 10))
                      : ""}
                  </Text>
                  {conversation.unread > 0 ? (
                    <View style={styles.dot}>
                      <Text style={styles.dotText}>{conversation.unread}</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </QueryState>
    </View>
  );
}

const styles = themed(() => ({
  screen: { flex: 1, backgroundColor: colors.background },
  actions: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionText: { ...typography.caption, color: colors.textPrimary },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  pressed: { opacity: 0.8 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(11,37,69,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarGroup: { borderRadius: radius.md },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { ...typography.body, fontFamily: "Tajawal_500Medium" },
  rowMeta: { ...typography.caption, fontSize: 11 },
  rowEnd: { alignItems: "flex-end", gap: spacing.xs },
  time: { ...typography.caption, fontSize: 10 },
  dot: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  dotText: { ...typography.caption, fontSize: 11, color: colors.textOnPrimary },
}));
