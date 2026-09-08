import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/EmptyState";
import { OfflineBanner } from "@/components/OfflineBanner";
import { QueryState } from "@/components/QueryState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";
import { fetchGroups } from "@/services/groupService";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import type { DiscussionGroup } from "@/types/models";

export default function GroupsScreen() {
  const enabled = useAdminSettingsStore((state) => state.discussionEnabled);
  const query = useQuery({ queryKey: ["groups"], queryFn: fetchGroups, enabled });
  const groups = query.data ?? [];

  if (!enabled) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="المجموعات النقاشية" />
        <EmptyState
          icon="lock-closed-outline"
          title="المجموعات النقاشية موقوفة حاليًا"
          subtitle="أوقفت الإدارة هذه الخاصية مؤقتًا. تابع الإعلانات لمعرفة موعد تفعيلها."
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="المجموعات النقاشية" />
      <OfflineBanner />
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={query.refetch}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.rules}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.marineDeep} />
            <Text style={styles.rulesText}>
              نقاش عام مُدار حول الأنشطة. يُمنع نشر أي معلومة أو صورة تخصّ المواقع أو الأعمال
              التشغيلية، ولا توجد مراسلات خاصة بين المستخدمين — كل مشاركة يراها الجميع وتراجعها الإدارة.
            </Text>
          </View>

          {groups.length === 0 ? (
            <EmptyState
              icon="chatbubbles-outline"
              title="لا توجد مجموعات بعد"
              subtitle="تُنشئ الإدارة المجموعات حسب الأنشطة والمواضيع."
            />
          ) : (
            groups.map((group) => <GroupCard key={group.id} group={group} />)
          )}
        </ScrollView>
      </QueryState>
    </View>
  );
}

function GroupCard({ group }: { group: DiscussionGroup }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/groups/${group.id}`)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
    >
      {group.coverImage ? (
        <Image
          source={{ uri: group.coverImage }}
          style={styles.cover}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={[styles.cover, styles.coverFallback]}>
          <Ionicons name="chatbubbles-outline" size={24} color={colors.onPrimaryMuted} />
        </View>
      )}

      <View style={styles.cardBody}>
        <View style={styles.cardHead}>
          <Text style={styles.title} numberOfLines={1}>
            {group.title}
          </Text>
          {group.locked ? <Ionicons name="lock-closed" size={14} color={colors.warning} /> : null}
        </View>
        <Text style={styles.topic}>{group.topic}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {group.description}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="chatbox-outline" size={14} color={colors.textMuted} />
          <Text style={styles.meta}>{group.postCount} مشاركة</Text>
          {group.audience === "registered" ? (
            <>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.meta}>للمسجّلين في النشاط</Text>
            </>
          ) : null}
        </View>
      </View>

      <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl, gap: spacing.md },
  rules: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.infoSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  rulesText: { ...typography.caption, flex: 1, lineHeight: 20, color: colors.textSecondary },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cover: { width: 62, height: 62, borderRadius: radius.md, backgroundColor: colors.backgroundDeep },
  coverFallback: { backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1, gap: 3 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { ...typography.h3, fontSize: 15, flexShrink: 1 },
  topic: { ...typography.caption, fontSize: 11, color: colors.marineDeep },
  description: { ...typography.caption, lineHeight: 19 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  meta: { ...typography.caption, fontSize: 11 },
  metaDot: { color: colors.textMuted, fontSize: 11 },
});
