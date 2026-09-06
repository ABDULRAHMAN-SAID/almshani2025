import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/EmptyState";
import { FilterChips } from "@/components/FilterChips";
import { tintBackground } from "@/constants/categories";
import { colors, radius, spacing, typography } from "@/constants";
import { fetchAwarenessLibrary } from "@/services/awarenessService";
import { formatArabicDate } from "@/utils/date";

const FILTERS = [
  { key: "الكل", label: "الكل" },
  { key: "أمني", label: "التثقيف الأمني" },
  { key: "مكافحة المخدرات", label: "مكافحة المخدرات" },
  { key: "السلامة", label: "السلامة" },
];

const CATEGORY_STYLE: Record<string, { icon: keyof typeof Ionicons.glyphMap; tint: string }> = {
  "أمني": { icon: "shield-checkmark-outline", tint: "#434190" },
  "مكافحة المخدرات": { icon: "leaf-outline", tint: "#276749" },
  "السلامة": { icon: "medkit-outline", tint: "#B7791F" },
};

/** مكتبة المحتوى التوعوي: بطاقات قصيرة مصنّفة، وكل بطاقة تفتح المقال كاملًا. */
export default function AwarenessScreen() {
  const { data: articles } = useQuery({ queryKey: ["awareness-library"], queryFn: fetchAwarenessLibrary });
  const [filterKey, setFilterKey] = useState("الكل");

  const visible = useMemo(() => {
    const list = articles ?? [];
    if (filterKey === "الكل") return list;
    return list.filter((article) => article.category === filterKey);
  }, [articles, filterKey]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>التوعية</Text>
        <Text style={styles.subtitle}>محتوى توعوي عام: أمن المعلومات، مكافحة المخدرات، والسلامة</Text>
      </View>

      <View style={styles.filters}>
        <FilterChips items={FILTERS} activeKey={filterKey} onChange={setFilterKey} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {visible.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            {visible.map((article) => {
              const style = CATEGORY_STYLE[article.category] ?? CATEGORY_STYLE["أمني"];
              return (
                <Pressable
                  key={article.id}
                  accessibilityRole="button"
                  onPress={() => router.push(`/awareness/${article.id}`)}
                  style={({ pressed }) => [
                    styles.card,
                    { borderRightColor: style.tint },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.cardHead}>
                    <View style={[styles.iconWrap, { backgroundColor: tintBackground(style.tint) }]}>
                      <Ionicons name={style.icon} size={17} color={style.tint} />
                    </View>
                    <Text style={[styles.category, { color: style.tint }]}>{article.category}</Text>
                    <Text style={styles.date}>{formatArabicDate(article.publishedAt)}</Text>
                  </View>
                  <Text style={styles.cardTitle}>{article.title}</Text>
                  <Text style={styles.cardSummary} numberOfLines={3}>
                    {article.summary}
                  </Text>
                  <View style={styles.more}>
                    <Text style={styles.moreLabel}>اعرف أكثر</Text>
                    <Ionicons name="chevron-back" size={14} color={colors.primary} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <EmptyState icon="bulb-outline" title="لا يوجد محتوى في هذا التصنيف" />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: 2, marginBottom: spacing.md },
  title: { ...typography.h1 },
  subtitle: { ...typography.bodyMuted },
  filters: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  content: { padding: spacing.lg, paddingTop: 0 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderRightWidth: 3,
    gap: spacing.xs,
  },
  pressed: { opacity: 0.9 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 2 },
  iconWrap: { width: 32, height: 32, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  category: { fontFamily: "Tajawal_500Medium", fontSize: 12, flex: 1 },
  date: { ...typography.caption, fontSize: 11 },
  cardTitle: { ...typography.h3 },
  cardSummary: { ...typography.bodyMuted, lineHeight: 21 },
  more: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: spacing.xs },
  moreLabel: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: colors.primary },
});
