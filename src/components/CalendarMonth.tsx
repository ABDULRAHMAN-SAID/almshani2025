import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { CATEGORY_META } from "@/constants/categories";
import { OCCASION_TINT, occasionsOfYear } from "@/constants/occasions";
import { colors, radius, shadow, spacing, typography, themed } from "@/constants";
import type { Activity } from "@/types/models";
import { arabicMonthName, hijriMonthOf } from "@/utils/date";
import { arabicNumber } from "@/utils/weather";
import { ARABIC_WEEKDAYS_SHORT, buildMonthGrid } from "@/utils/calendar";

interface CalendarMonthProps {
  year: number;
  monthIndex: number;
  activitiesByDate: Record<string, Activity[]>;
  selectedIso: string | null;
  onSelectDate: (iso: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  hijriOffset?: number;
}

/**
 * شبكة الشهر على هيئة ورقة تقويمٍ حقيقية.
 *
 * رأسٌ كحليٌّ متدرّج يحمل اسم الشهر كبيرًا وتحته الشهرُ الهجري الذي يقابله —
 * لأن من يخطّط في السلطنة يعيش بالتقويمين معًا، ويسأل «متى رمضان» بقدر ما
 * يسأل «متى سبتمبر». والجمعة والسبت مظلّلتان لأنهما عطلة الأسبوع هنا.
 * والمناسبات الرسمية والدينية ملوَّنة في خاناتها ومسرودةٌ تحت الشبكة —
 * فالشبكة تُري الموضع، والسرد يقول ما هو.
 */
export function CalendarMonth({
  year,
  monthIndex,
  activitiesByDate,
  selectedIso,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  hijriOffset,
}: CalendarMonthProps) {
  const cells = buildMonthGrid(year, monthIndex);
  const occasions = useMemo(() => occasionsOfYear(year, hijriOffset), [year, hijriOffset]);

  // مدى الشهر الهجري: أوّل يومٍ وآخره، فإن اختلف شهراهما كُتبا معًا.
  const hijriRange = useMemo(() => {
    const first = hijriMonthOf(new Date(year, monthIndex, 1, 12), hijriOffset);
    const last = hijriMonthOf(new Date(year, monthIndex + 1, 0, 12), hijriOffset);
    if (first.month === last.month) return `${first.name} ${arabicNumber(first.year)} هـ`;
    const years = first.year === last.year ? arabicNumber(last.year) : `${arabicNumber(first.year)}–${arabicNumber(last.year)}`;
    return `${first.name} – ${last.name} ${years} هـ`;
  }, [year, monthIndex, hijriOffset]);

  const monthPrefix = `${year}-${String(monthIndex + 1).padStart(2, "0")}-`;
  const monthOccasions = Object.entries(occasions)
    .filter(([iso]) => iso.startsWith(monthPrefix))
    .sort(([a], [b]) => a.localeCompare(b));
  const activityCount = Object.entries(activitiesByDate)
    .filter(([iso]) => iso.startsWith(monthPrefix))
    .reduce((sum, [, list]) => sum + list.length, 0);

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={[colors.primaryLight, colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="الشهر السابق"
          onPress={onPrevMonth}
          hitSlop={8}
          style={styles.navButton}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.textOnPrimary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.monthLabel}>
            {arabicMonthName(monthIndex)} <Text style={styles.yearLabel}>{year}</Text>
          </Text>
          <Text style={styles.hijriLabel}>{hijriRange}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="الشهر التالي"
          onPress={onNextMonth}
          hitSlop={8}
          style={styles.navButton}
        >
          <Ionicons name="chevron-back" size={18} color={colors.textOnPrimary} />
        </Pressable>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.weekdayRow}>
          {ARABIC_WEEKDAYS_SHORT.map((weekday, index) => (
            <Text key={weekday} style={[styles.weekday, index >= 5 && styles.weekdayWeekend]}>
              {weekday}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((cell, index) => {
            const weekend = index % 7 >= 5;
            if (!cell.iso) {
              return <View key={`pad-${index}`} style={styles.cell} />;
            }
            const dayActivities = activitiesByDate[cell.iso] ?? [];
            const marks = occasions[cell.iso] ?? [];
            const tint = marks.length > 0 ? OCCASION_TINT[marks[0].kind] : null;
            const isSelected = cell.iso === selectedIso;
            return (
              <Pressable
                key={cell.iso}
                accessibilityRole="button"
                accessibilityLabel={`${cell.day} ${arabicMonthName(monthIndex)}${marks.length ? ` — ${marks[0].label}` : ""}`}
                accessibilityState={{ selected: isSelected }}
                onPress={() => onSelectDate(cell.iso!)}
                style={styles.cell}
              >
                <View
                  style={[
                    styles.dayBox,
                    tint && !cell.isToday ? { backgroundColor: `${tint}1F` } : null,
                    isSelected && !cell.isToday && styles.daySelected,
                    cell.isToday && styles.dayToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      weekend && styles.dayTextWeekend,
                      tint && !cell.isToday ? { color: tint, fontFamily: "Tajawal_700Bold" } : null,
                      isSelected && !cell.isToday && styles.dayTextSelected,
                      cell.isToday && styles.dayTextToday,
                    ]}
                  >
                    {arabicNumber(cell.day ?? 0)}
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

        {/* خلاصة الشهر: كم نشاطًا فيه، وما مناسباته. */}
        <View style={styles.footer}>
          <View style={styles.countPill}>
            <Ionicons name="sparkles-outline" size={13} color={colors.primary} />
            <Text style={styles.countText}>
              {activityCount === 0
                ? "لا أنشطة مجدولة"
                : activityCount === 1
                  ? "نشاطٌ واحد"
                  : activityCount === 2
                    ? "نشاطان"
                    : `${arabicNumber(activityCount)} أنشطة`}
            </Text>
          </View>
          {monthOccasions.map(([iso, items]) =>
            items.map((item) => (
              <Pressable
                key={`${iso}-${item.label}`}
                accessibilityRole="button"
                onPress={() => onSelectDate(iso)}
                style={styles.occasionRow}
              >
                <View style={[styles.occasionDot, { backgroundColor: OCCASION_TINT[item.kind] }]} />
                <Text style={styles.occasionLabel} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={styles.occasionDate}>{arabicNumber(Number(iso.slice(8)))}</Text>
              </Pressable>
            ))
          )}
        </View>
      </View>
    </View>
  );
}

const styles = themed(() => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    overflow: "hidden",
    ...shadow.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  navButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, alignItems: "center", gap: 2 },
  monthLabel: { fontFamily: "Tajawal_700Bold", fontSize: 22, lineHeight: 28, color: colors.textOnPrimary },
  yearLabel: { fontFamily: "Tajawal_400Regular", fontSize: 17, color: colors.textOnPrimaryMuted },
  hijriLabel: { fontFamily: "Tajawal_400Regular", fontSize: 12.5, color: colors.textOnPrimaryMuted },

  body: { paddingHorizontal: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.sm },
  weekdayRow: { flexDirection: "row", marginBottom: spacing.xs },
  weekday: { ...typography.caption, flex: 1, textAlign: "center", fontSize: 11, fontFamily: "Tajawal_500Medium" },
  weekdayWeekend: { color: colors.accent },

  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, alignItems: "center", paddingVertical: 3 },
  dayBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dayToday: { backgroundColor: colors.primary, ...shadow.subtle },
  daySelected: { borderWidth: 1.5, borderColor: colors.primary },
  dayText: { fontFamily: "Tajawal_500Medium", fontSize: 14, color: colors.textPrimary },
  dayTextWeekend: { color: colors.textMuted },
  dayTextSelected: { color: colors.primary, fontFamily: "Tajawal_700Bold" },
  dayTextToday: { color: colors.textOnPrimary, fontFamily: "Tajawal_700Bold" },
  dots: { flexDirection: "row", gap: 2, height: 6, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },

  footer: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  countPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
  },
  countText: { ...typography.caption, color: colors.primary, fontFamily: "Tajawal_500Medium" },
  occasionRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 2 },
  occasionDot: { width: 7, height: 7, borderRadius: 4 },
  occasionLabel: { ...typography.body, fontSize: 13.5, flex: 1 },
  occasionDate: { ...typography.caption, fontSize: 12, fontFamily: "Tajawal_500Medium" },
}));
