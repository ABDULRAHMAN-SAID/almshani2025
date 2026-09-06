import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ActivityListRow } from "@/components/ActivityListRow";
import { EmptyState } from "@/components/EmptyState";
import { FilterChips } from "@/components/FilterChips";
import { colors, spacing, typography } from "@/constants";
import { useAllActivities } from "@/hooks/useActivities";
import { useRegistrationStore } from "@/store/registrationStore";
import { ACTIVITY_FORMS, pluralizeAr } from "@/utils/arabic";
import { TODAY_ISO } from "@/utils/calendar";

const TABS = [
  { key: "upcoming", label: "القادمة" },
  { key: "past", label: "السابقة" },
  { key: "competitions", label: "المسابقات" },
  { key: "lectures", label: "المحاضرات" },
  { key: "sports", label: "الرياضة" },
];

/** الأنشطة التي سجّل فيها المستخدم، مقسّمة حسب الوقت والنوع. */
export default function MyActivitiesScreen() {
  const { data: activities } = useAllActivities();
  const registeredIds = useRegistrationStore((state) => state.registeredIds);
  const [tab, setTab] = useState("upcoming");

  const mine = useMemo(
    () => (activities ?? []).filter((activity) => registeredIds.includes(activity.id)),
    [activities, registeredIds]
  );

  const visible = useMemo(() => {
    switch (tab) {
      case "upcoming":
        return mine.filter((activity) => activity.date >= TODAY_ISO);
      case "past":
        return mine.filter((activity) => activity.date < TODAY_ISO);
      case "competitions":
        return mine.filter((activity) =>
          ["Cultural", "TrafficSafety", "AviationSafety", "SecurityAwareness"].includes(activity.category)
        );
      case "lectures":
        return mine.filter((activity) => activity.category === "Lecture");
      case "sports":
        return mine.filter((activity) => activity.category === "Sports");
      default:
        return mine;
    }
  }, [mine, tab]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>نشاطاتي</Text>
        <Text style={styles.subtitle}>
          {mine.length > 0 ? `أنت مسجّل في ${pluralizeAr(mine.length, ACTIVITY_FORMS)}` : "لم تسجّل في أي نشاط بعد"}
        </Text>
      </View>

      <View style={styles.filters}>
        <FilterChips items={TABS} activeKey={tab} onChange={setTab} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {visible.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            {visible.map((activity) => (
              <ActivityListRow
                key={activity.id}
                activity={activity}
                showDate
                onPress={() => router.push(`/activity/${activity.id}`)}
              />
            ))}
          </View>
        ) : mine.length === 0 ? (
          <EmptyState
            icon="bookmark-outline"
            title="لم تسجّل في أي نشاط بعد"
            subtitle="تصفّح الأنشطة القادمة من الصفحة الرئيسية أو التقويم وسجّل فيما يناسبك"
          />
        ) : (
          <EmptyState icon="bookmark-outline" title="لا توجد أنشطة في هذا التصنيف" />
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
});
