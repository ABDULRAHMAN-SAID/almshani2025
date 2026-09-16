import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/EmptyState";
import { FilterChips } from "@/components/FilterChips";
import { NewsCard } from "@/components/NewsCard";
import { QueryState } from "@/components/QueryState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, spacing } from "@/constants";
import { NEWS_SCOPE_LABEL } from "@/constants/categories";
import { fetchNews, visibleNews } from "@/services/newsService";
import type { NewsScope } from "@/types/models";

const FILTERS = [
  { key: "all", label: "الكل" },
  { key: "oman", label: NEWS_SCOPE_LABEL.oman },
  { key: "world", label: NEWS_SCOPE_LABEL.world },
];

export default function NewsScreen() {
  const [filter, setFilter] = useState("all");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["news"],
    queryFn: () => fetchNews(),
  });

  // ما لم يحن وقته أو انقضى لا يُعرض: الوقت يُكتب عند النشر وتحترمه الشاشة.
  const list = visibleNews(data ?? []).filter(
    (item) => filter === "all" || item.scope === (filter as NewsScope)
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader title="الأخبار" />
      <FilterChips items={FILTERS} activeKey={filter} onChange={setFilter} />
      <QueryState isLoading={isLoading} error={error} onRetry={() => void refetch()}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {list.length > 0 ? (
            list.map((item) => <NewsCard key={item.id} item={item} />)
          ) : (
            <EmptyState icon="newspaper-outline" title="لا توجد أخبار منشورة بعد" />
          )}
        </ScrollView>
      </QueryState>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
});
