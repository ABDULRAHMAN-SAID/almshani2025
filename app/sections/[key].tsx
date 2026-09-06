import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityListRow } from "@/components/ActivityListRow";
import { EmptyState } from "@/components/EmptyState";
import { FilterChips } from "@/components/FilterChips";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SECTION_DEFINITIONS } from "@/constants/sections";
import { colors, spacing, typography } from "@/constants";
import { useAllActivities } from "@/hooks/useActivities";
import { ACTIVITY_FORMS, pluralizeAr } from "@/utils/arabic";
import { TODAY_ISO } from "@/utils/calendar";

/** شاشة قائمة موحّدة لكل الأقسام: المسابقات، المحاضرات، الرياضة، الرماية، السلامة. */
export default function SectionScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const section = SECTION_DEFINITIONS[key];
  const { data: activities } = useAllActivities();
  const [filterKey, setFilterKey] = useState("all");

  const list = useMemo(() => {
    if (!section) return [];
    const inSection = (activities ?? []).filter((activity) =>
      section.categories.includes(activity.category)
    );
    const filter = section.filters.find((item) => item.key === filterKey);
    const filtered =
      !filter || filter.categories.length === 0
        ? inSection
        : inSection.filter((activity) => filter.categories.includes(activity.category));
    // القادم أولًا ثم المنتهي، وكلٌ مرتّب زمنيًا
    const upcoming = filtered.filter((a) => a.date >= TODAY_ISO).sort((a, b) => a.date.localeCompare(b.date));
    const past = filtered.filter((a) => a.date < TODAY_ISO).sort((a, b) => b.date.localeCompare(a.date));
    return [...upcoming, ...past];
  }, [activities, section, filterKey]);

  if (!section) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="القسم" />
        <EmptyState icon="alert-circle-outline" title="هذا القسم غير موجود" />
      </View>
    );
  }

  const upcomingCount = list.filter((activity) => activity.date >= TODAY_ISO).length;

  return (
    <View style={styles.screen}>
      <ScreenHeader title={section.title} />
      <Text style={styles.subtitle}>{section.subtitle}</Text>

      {section.filters.length > 1 ? (
        <View style={styles.filters}>
          <FilterChips items={section.filters} activeKey={filterKey} onChange={setFilterKey} />
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {list.length > 0 ? (
          <>
            <Text style={styles.count}>
              {upcomingCount > 0
                ? `${pluralizeAr(upcomingCount, ACTIVITY_FORMS)} قادمة`
                : "لا توجد أنشطة قادمة — يعرض القسم الأنشطة السابقة"}
            </Text>
            <View style={{ gap: spacing.sm }}>
              {list.map((activity) => (
                <ActivityListRow
                  key={activity.id}
                  activity={activity}
                  showDate
                  onPress={() => router.push(`/activity/${activity.id}`)}
                />
              ))}
            </View>
          </>
        ) : (
          <EmptyState
            icon="calendar-outline"
            title="لا توجد أنشطة في هذا القسم حاليًا"
            subtitle="سيتم إعلامك عند إضافة نشاط جديد"
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  subtitle: { ...typography.bodyMuted, textAlign: "center", paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  filters: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  content: { padding: spacing.lg, paddingTop: 0 },
  count: { ...typography.caption, marginBottom: spacing.sm },
});
