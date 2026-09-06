import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/EmptyState";
import { PatternOverlay } from "@/components/PatternOverlay";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";
import { fetchAwarenessArticle } from "@/services/awarenessService";
import { formatArabicDate } from "@/utils/date";

const CATEGORY_TINT: Record<string, string> = {
  "أمني": "#434190",
  "مكافحة المخدرات": "#276749",
  "السلامة": "#B7791F",
};

export default function AwarenessArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: article, isLoading } = useQuery({
    queryKey: ["awareness-article", id],
    queryFn: () => fetchAwarenessArticle(id),
  });

  if (isLoading) return <View style={styles.screen} />;
  if (!article) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="التوعية" />
        <EmptyState icon="alert-circle-outline" title="لم يتم العثور على هذا المحتوى" />
      </View>
    );
  }

  const tint = CATEGORY_TINT[article.category] ?? colors.primary;

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[colors.primaryLight, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cover}
      >
        <PatternOverlay opacity={0.08} />
        <ScreenHeader title="التوعية" onDark />
        <View style={styles.coverBody}>
          <View style={styles.badge}>
            <Ionicons name="bulb-outline" size={14} color={colors.gold} />
            <Text style={styles.badgeText}>{article.category}</Text>
          </View>
          <Text style={styles.coverTitle}>{article.title}</Text>
          <Text style={styles.coverDate}>{formatArabicDate(article.publishedAt)}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.summaryCard, { borderRightColor: tint }]}>
          <Text style={styles.summary}>{article.summary}</Text>
        </View>
        <Text style={styles.body}>{article.content}</Text>

        <View style={styles.noteCard}>
          <Ionicons name="information-circle-outline" size={17} color={colors.textMuted} />
          <Text style={styles.noteText}>
            هذا المحتوى توعوي عام، ولا يتضمن أي تفاصيل تشغيلية أو معلومات مقيّدة.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  cover: {
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.lg + 8,
    borderBottomRightRadius: radius.lg + 8,
    overflow: "hidden",
  },
  coverBody: { paddingHorizontal: spacing.lg, gap: spacing.xs },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(199,162,82,0.18)",
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  badgeText: { fontFamily: "Tajawal_500Medium", fontSize: 12, color: colors.gold },
  coverTitle: { ...typography.h1, color: colors.textOnPrimary, fontSize: 22 },
  coverDate: { fontFamily: "Tajawal_400Regular", fontSize: 12.5, color: "rgba(255,255,255,0.7)" },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderRightWidth: 3,
    marginBottom: spacing.lg,
  },
  summary: { ...typography.body, fontFamily: "Tajawal_500Medium", lineHeight: 24 },
  body: { ...typography.body, lineHeight: 26 },
  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  noteText: { ...typography.caption, flex: 1, lineHeight: 19 },
});
