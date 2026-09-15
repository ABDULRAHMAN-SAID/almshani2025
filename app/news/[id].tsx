import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/EmptyState";
import { QueryState } from "@/components/QueryState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";
import { fetchNewsItem } from "@/services/newsService";
import type { NewsItem } from "@/types/models";
import { formatArabicDate } from "@/utils/date";

const SCOPE_LABEL: Record<NewsItem["scope"], string> = { oman: "عُمان", world: "عالمي" };

/**
 * الخبر كاملًا.
 *
 * ولم تكن هذه الشاشة موجودة: كانت البطاقة تُفتح على رابط المصدر إن وُجد،
 * ولا شيء إن لم يوجد — فالخبر الذي تكتبه الإدارة بنصّها هي، بلا رابط خارجي،
 * كان يُنشر ولا يُقرأ منه إلا سطران في البطاقة. وهذا هو الحال الغالب: أن
 * تكتب القاعدة خبرها بنفسها.
 */
export default function NewsItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    data: item,
    isLoading,
    error,
    refetch,
  } = useQuery({ queryKey: ["news", id], queryFn: () => fetchNewsItem(id) });

  if (isLoading || error) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="الخبر" />
        <QueryState isLoading={isLoading} error={error} onRetry={() => void refetch()}>
          {null}
        </QueryState>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="الخبر" />
        <EmptyState icon="newspaper-outline" title="لم يعد هذا الخبر منشورًا" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="الخبر" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
        ) : null}

        <View style={styles.metaRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{SCOPE_LABEL[item.scope]}</Text>
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {item.source ? `${item.source} · ` : ""}
            {formatArabicDate(item.publishedAt.slice(0, 10))}
          </Text>
        </View>

        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.summary}>{item.summary}</Text>

        {item.body ? <Text style={styles.body}>{item.body}</Text> : null}

        {item.url ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void Linking.openURL(item.url as string)}
            style={({ pressed }) => [styles.sourceButton, pressed && styles.pressed]}
          >
            <Ionicons name="open-outline" size={18} color={colors.primary} />
            <Text style={styles.sourceText}>افتح المصدر</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  image: {
    width: "100%",
    height: 210,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.xs,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: { ...typography.caption, fontSize: 11, color: colors.textPrimary },
  meta: { ...typography.caption, flex: 1, fontSize: 12 },
  title: { ...typography.h2, lineHeight: 34 },
  summary: { ...typography.body, color: colors.textSecondary, lineHeight: 26 },
  body: { ...typography.body, lineHeight: 28, marginTop: spacing.xs },
  sourceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.75 },
  sourceText: { ...typography.body, color: colors.primary },
});
