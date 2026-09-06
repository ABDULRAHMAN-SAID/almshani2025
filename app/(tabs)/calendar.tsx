import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ActivityListRow } from "@/components/ActivityListRow";
import { CalendarMonth } from "@/components/CalendarMonth";
import { EmptyState } from "@/components/EmptyState";
import { FilterChips } from "@/components/FilterChips";
import { CALENDAR_FILTERS } from "@/constants/categories";
import { colors, radius, spacing, typography } from "@/constants";
import { useAllActivities } from "@/hooks/useActivities";
import { showToast } from "@/store/toastStore";
import { ACTIVITY_FORMS, pluralizeAr } from "@/utils/arabic";
import { arabicMonthName, formatArabicDate, formatArabicWeekday } from "@/utils/date";
import { TODAY_ISO, groupActivitiesByDate, groupActivitiesByMonth } from "@/utils/calendar";

type CalendarView = "month" | "year";

export default function CalendarScreen() {
  const { data: activities, isLoading } = useAllActivities();
  const [view, setView] = useState<CalendarView>("month");
  const [filterKey, setFilterKey] = useState("all");
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), monthIndex: now.getMonth() };
  });
  const [selectedIso, setSelectedIso] = useState<string | null>(TODAY_ISO);

  const filtered = useMemo(() => {
    const list = activities ?? [];
    const filter = CALENDAR_FILTERS.find((item) => item.key === filterKey);
    if (!filter || filter.categories.length === 0) return list;
    return list.filter((activity) => filter.categories.includes(activity.category));
  }, [activities, filterKey]);

  const byDate = useMemo(() => groupActivitiesByDate(filtered), [filtered]);
  const byMonth = useMemo(() => groupActivitiesByMonth(filtered, cursor.year), [filtered, cursor.year]);

  const selectedActivities = selectedIso ? byDate[selectedIso] ?? [] : [];

  const goPrevMonth = () =>
    setCursor(({ year, monthIndex }) =>
      monthIndex === 0 ? { year: year - 1, monthIndex: 11 } : { year, monthIndex: monthIndex - 1 }
    );
  const goNextMonth = () =>
    setCursor(({ year, monthIndex }) =>
      monthIndex === 11 ? { year: year + 1, monthIndex: 0 } : { year, monthIndex: monthIndex + 1 }
    );

  const openActivity = () => showToast("شاشة تفاصيل النشاط ستُضاف في المرحلة القادمة");

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>التقويم</Text>
        <View style={styles.toggle}>
          <ToggleButton label="شهري" active={view === "month"} onPress={() => setView("month")} />
          <ToggleButton label="سنوي" active={view === "year"} onPress={() => setView("year")} />
        </View>
      </View>

      <View style={styles.filters}>
        <FilterChips items={CALENDAR_FILTERS} activeKey={filterKey} onChange={setFilterKey} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? null : view === "month" ? (
          <>
            <CalendarMonth
              year={cursor.year}
              monthIndex={cursor.monthIndex}
              activitiesByDate={byDate}
              selectedIso={selectedIso}
              onSelectDate={setSelectedIso}
              onPrevMonth={goPrevMonth}
              onNextMonth={goNextMonth}
            />

            <View style={styles.daySection}>
              <Text style={styles.dayHeading}>
                {selectedIso
                  ? `${formatArabicWeekday(selectedIso)} · ${formatArabicDate(selectedIso)}`
                  : "اختر يومًا لعرض أنشطته"}
              </Text>
              {selectedActivities.length > 0 ? (
                <View style={{ gap: spacing.sm }}>
                  {selectedActivities.map((activity) => (
                    <ActivityListRow key={activity.id} activity={activity} onPress={openActivity} />
                  ))}
                </View>
              ) : (
                <EmptyState icon="calendar-outline" title="لا توجد أنشطة في هذا اليوم" />
              )}
            </View>
          </>
        ) : (
          <View style={{ gap: spacing.lg }}>
            <Text style={styles.yearLabel}>{cursor.year}</Text>
            {Array.from({ length: 12 }, (_, monthIndex) => {
              const monthActivities = byMonth[monthIndex] ?? [];
              return (
                <View key={monthIndex} style={styles.monthBlock}>
                  <View style={styles.monthHeading}>
                    <Text style={styles.monthName}>{arabicMonthName(monthIndex)}</Text>
                    <Text style={styles.monthCount}>
                      {monthActivities.length > 0
                        ? pluralizeAr(monthActivities.length, ACTIVITY_FORMS)
                        : "لا توجد أنشطة"}
                    </Text>
                  </View>
                  {monthActivities.length > 0 ? (
                    <View style={{ gap: spacing.sm }}>
                      {monthActivities.map((activity) => (
                        <ActivityListRow key={activity.id} activity={activity} showDate onPress={openActivity} />
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ToggleButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.toggleButton, active && styles.toggleButtonActive]}
    >
      <Text style={[styles.toggleLabel, active && styles.toggleLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    marginBottom: spacing.md,
  },
  title: { ...typography.h1 },
  toggle: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleButton: { paddingHorizontal: spacing.lg, paddingVertical: 6, borderRadius: radius.pill },
  toggleButtonActive: { backgroundColor: colors.primary },
  toggleLabel: { fontFamily: "Tajawal_500Medium", fontSize: 12.5, color: colors.textMuted },
  toggleLabelActive: { color: colors.textOnPrimary },
  filters: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  daySection: { marginTop: spacing.xl, gap: spacing.md },
  dayHeading: { ...typography.h3 },
  yearLabel: { ...typography.h2, textAlign: "center" },
  monthBlock: { gap: spacing.sm },
  monthHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthName: { ...typography.h3 },
  monthCount: { ...typography.caption },
});
