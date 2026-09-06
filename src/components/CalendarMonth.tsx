import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CATEGORY_META } from "@/constants/categories";
import { colors, radius, spacing, typography } from "@/constants";
import type { Activity } from "@/types/models";
import { arabicMonthName } from "@/utils/date";
import { ARABIC_WEEKDAYS_SHORT, buildMonthGrid } from "@/utils/calendar";

interface CalendarMonthProps {
  year: number;
  monthIndex: number;
  activitiesByDate: Record<string, Activity[]>;
  selectedIso: string | null;
  onSelectDate: (iso: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

/** شبكة الشهر: رأس بالتنقل بين الأشهر، أسماء الأيام، ثم الأيام مع نقاط تشير للأنشطة. */
export function CalendarMonth({
  year,
  monthIndex,
  activitiesByDate,
  selectedIso,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: CalendarMonthProps) {
  const cells = buildMonthGrid(year, monthIndex);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="الشهر السابق" onPress={onPrevMonth} hitSlop={10}>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </Pressable>
        <Text style={styles.monthLabel}>
          {arabicMonthName(monthIndex)} {year}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="الشهر التالي" onPress={onNextMonth} hitSlop={10}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {ARABIC_WEEKDAYS_SHORT.map((weekday) => (
          <Text key={weekday} style={styles.weekday}>
            {weekday}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, index) => {
          if (!cell.iso) {
            return <View key={`pad-${index}`} style={styles.cell} />;
          }
          const dayActivities = activitiesByDate[cell.iso] ?? [];
          const isSelected = cell.iso === selectedIso;
          return (
            <Pressable
              key={cell.iso}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelectDate(cell.iso!)}
              style={styles.cell}
            >
              <View style={[styles.dayCircle, cell.isToday && styles.dayToday, isSelected && styles.daySelected]}>
                <Text
                  style={[
                    styles.dayText,
                    cell.isToday && styles.dayTextToday,
                    isSelected && styles.dayTextSelected,
                  ]}
                >
                  {cell.day}
                </Text>
              </View>
              <View style={styles.dots}>
                {dayActivities.slice(0, 3).map((activity) => (
                  <View
                    key={activity.id}
                    style={[styles.dot, { backgroundColor: CATEGORY_META[activity.category].tint }]}
                  />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  monthLabel: { ...typography.h3 },
  weekdayRow: { flexDirection: "row", marginBottom: spacing.xs },
  weekday: { ...typography.caption, flex: 1, textAlign: "center", fontSize: 11 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, alignItems: "center", paddingVertical: 4 },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dayToday: { borderWidth: 1.5, borderColor: colors.accent },
  daySelected: { backgroundColor: colors.primary },
  dayText: { fontFamily: "Tajawal_500Medium", fontSize: 13.5, color: colors.textPrimary },
  dayTextToday: { color: colors.accent, fontFamily: "Tajawal_700Bold" },
  dayTextSelected: { color: colors.textOnPrimary },
  dots: { flexDirection: "row", gap: 2, height: 6, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
