import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ActivityListRow } from "@/components/ActivityListRow";
import { EmptyState } from "@/components/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SearchBar } from "@/components/SearchBar";
import { colors, radius, spacing, typography } from "@/constants";
import { useAllActivities } from "@/hooks/useActivities";
import { useAnnouncements } from "@/hooks/useNotifications";
import { fetchAwarenessLibrary } from "@/services/awarenessService";
import { formatArabicDate } from "@/utils/date";

/** بحث موحّد في الأنشطة والمحاضرات والمسابقات والإعلانات والمحتوى التوعوي. */
export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const { data: activities } = useAllActivities();
  const { data: announcements } = useAnnouncements();
  const { data: awareness } = useQuery({ queryKey: ["awareness-library"], queryFn: fetchAwarenessLibrary });

  const term = query.trim();

  const results = useMemo(() => {
    if (term.length < 2) return null;
    const match = (text: string) => text.includes(term);
    return {
      activities: (activities ?? []).filter(
        (activity) => match(activity.title) || match(activity.description) || match(activity.location)
      ),
      announcements: (announcements ?? []).filter(
        (announcement) => match(announcement.title) || match(announcement.description)
      ),
      awareness: (awareness ?? []).filter(
        (article) => match(article.title) || match(article.summary) || match(article.content)
      ),
    };
  }, [term, activities, announcements, awareness]);

  const total = results
    ? results.activities.length + results.announcements.length + results.awareness.length
    : 0;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="البحث" />

      <View style={styles.searchWrap}>
        <SearchBar value={query} onChangeText={setQuery} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!results ? (
          <EmptyState
            icon="search-outline"
            title="ابحث في كل محتوى التطبيق"
            subtitle="اكتب حرفين على الأقل للبحث في الأنشطة والمسابقات والمحاضرات والإعلانات والمحتوى التوعوي"
          />
        ) : total === 0 ? (
          <EmptyState icon="search-outline" title={`لا توجد نتائج لـ «${term}»`} subtitle="جرّب كلمة أخرى" />
        ) : (
          <View style={{ gap: spacing.xl }}>
            <Text style={styles.total}>{total} نتيجة</Text>

            {results.activities.length > 0 ? (
              <View style={styles.group}>
                <Text style={styles.groupTitle}>الأنشطة والمسابقات والمحاضرات</Text>
                <View style={{ gap: spacing.sm }}>
                  {results.activities.map((activity) => (
                    <ActivityListRow
                      key={activity.id}
                      activity={activity}
                      showDate
                      onPress={() => router.push(`/activity/${activity.id}`)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {results.announcements.length > 0 ? (
              <View style={styles.group}>
                <Text style={styles.groupTitle}>الإعلانات</Text>
                <View style={{ gap: spacing.sm }}>
                  {results.announcements.map((announcement) => (
                    <Pressable
                      key={announcement.id}
                      accessibilityRole="button"
                      onPress={() => router.push("/announcements")}
                      style={styles.row}
                    >
                      <Ionicons name="megaphone-outline" size={18} color={colors.accent} />
                      <View style={styles.rowText}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {announcement.title}
                        </Text>
                        <Text style={styles.rowMeta}>{formatArabicDate(announcement.publishedAt)}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {results.awareness.length > 0 ? (
              <View style={styles.group}>
                <Text style={styles.groupTitle}>المحتوى التوعوي</Text>
                <View style={{ gap: spacing.sm }}>
                  {results.awareness.map((article) => (
                    <Pressable
                      key={article.id}
                      accessibilityRole="button"
                      onPress={() => router.push(`/awareness/${article.id}`)}
                      style={styles.row}
                    >
                      <Ionicons name="bulb-outline" size={18} color={colors.gold} />
                      <View style={styles.rowText}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {article.title}
                        </Text>
                        <Text style={styles.rowMeta}>{article.category}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  searchWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  content: { padding: spacing.lg, paddingTop: 0 },
  total: { ...typography.caption },
  group: { gap: spacing.md },
  groupTitle: { ...typography.h3 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { ...typography.body, fontFamily: "Tajawal_500Medium" },
  rowMeta: { ...typography.caption },
});
