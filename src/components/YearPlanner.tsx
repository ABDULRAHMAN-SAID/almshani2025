import { useMemo } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, spacing, typography, themed } from "@/constants";
import { OCCASION_TINT, occasionsOfYear, type Occasion } from "@/constants/occasions";
import { arabicMonthName } from "@/utils/date";
import { arabicNumber } from "@/utils/weather";

/**
 * لوحة السنة كلّها — على هيئة تقويم الحائط الرسمي.
 *
 * الشهور أعمدة، والأيام صفوفًا بأسماء أسبوعها، وكل رقمٍ يقع في صفّ يومه.
 * وهذه ليست زخرفة: من يخطّط لسنةٍ ينظر إلى اثني عشر شهرًا معًا ليرى أين تقع
 * المناسبة وأين يتكدّس النشاط — والتقويم الشهريّ يُري شهرًا ويُخفي أحد عشر.
 *
 * والصفوف سبعةٌ مكرّرة: الأحد أوّلها كما في تقويم السلطنة. وأوّل الشهر يُوضع
 * في صفّ يومه، فتصطفّ الأسابيع رأسيًّا وتُقرأ العطلة عمودًا.
 */

const WEEKDAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const ROWS = 37; // أطول شهر ٣١ يومًا، وقد يبدأ في آخر صفّ من الأسبوع
const CELL = 38;
const ROW_H = 22;

interface YearPlannerProps {
  year: number;
  /** عدد الأنشطة في كل يوم: «2026-09-16» ← 3 */
  countsByDate: Record<string, number>;
  hijriOffset?: number;
  onSelectDate?: (iso: string) => void;
  selectedIso?: string | null;
  todayIso: string;
}

const pad = (value: number) => String(value).padStart(2, "0");

export function YearPlanner({
  year,
  countsByDate,
  hijriOffset,
  onSelectDate,
  selectedIso,
  todayIso,
}: YearPlannerProps) {
  const occasions = useMemo(() => occasionsOfYear(year, hijriOffset), [year, hijriOffset]);

  // لكل شهر: إزاحة أوّله عن الأحد، وعدد أيامه.
  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, month) => ({
        month,
        offset: new Date(year, month, 1).getDay(), // 0 = الأحد
        days: new Date(year, month + 1, 0).getDate(),
      })),
    [year]
  );

  const legend: { label: string; kind: Occasion["kind"] }[] = [
    { label: "رسمية", kind: "state" },
    { label: "دينية", kind: "religious" },
    { label: "عسكرية", kind: "military" },
  ];

  return (
    <View style={styles.wrap}>
      {/* رأسٌ كرأس اللوحة المعلّقة: سماءٌ وشعارٌ واسمٌ وسنةٌ كبيرة. والتقويم
          الرسمي يُعرف من رأسه قبل أن تُقرأ أرقامه. */}
      <LinearGradient
        colors={["#8FC0E8", "#2E6FA8", "#123A63"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.banner}
      >
        <Image
          source={require("@assets/images/logo/logo.png")}
          style={styles.crest}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>سلاح الجو السلطاني العُماني</Text>
          <Text style={styles.bannerSub}>قاعدة صلالة الجوية</Text>
        </View>
        <Text style={styles.bannerYear}>{year}</Text>
      </LinearGradient>

      <View style={styles.legendRow}>
        {legend.map((item) => (
          <View key={item.kind} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: OCCASION_TINT[item.kind] }]} />
            <Text style={styles.legendLabel}>{item.label}</Text>
          </View>
        ))}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.marine }]} />
          <Text style={styles.legendLabel}>نشاط</Text>
        </View>
      </View>

      <View style={styles.board}>
        {/* عمود أسماء الأيام — خارج التمرير الأفقي ليبقى ملاصقًا للأرقام. */}
        <View style={styles.dayNames}>
          <View style={styles.headSpacer} />
          {Array.from({ length: ROWS }, (_, row) => (
            <View key={row} style={[styles.nameCell, row % 7 >= 5 && styles.weekendCell]}>
              <Text style={[styles.nameText, row % 7 >= 5 && styles.weekendText]}>
                {WEEKDAYS[row % 7]}
              </Text>
            </View>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.columns}>
            {months.map(({ month, offset, days }) => (
              <View key={month} style={styles.column}>
                <View style={styles.monthHead}>
                  <Text style={styles.monthName} numberOfLines={1}>
                    {arabicMonthName(month)}
                  </Text>
                </View>

                {Array.from({ length: ROWS }, (_, row) => {
                  const day = row - offset + 1;
                  if (day < 1 || day > days) {
                    return <View key={row} style={[styles.cell, row % 7 >= 5 && styles.weekendCell]} />;
                  }
                  const iso = `${year}-${pad(month + 1)}-${pad(day)}`;
                  const marks = occasions[iso] ?? [];
                  const count = countsByDate[iso] ?? 0;
                  const isToday = iso === todayIso;
                  const isSelected = iso === selectedIso;
                  const tint = marks.length > 0 ? OCCASION_TINT[marks[0].kind] : null;

                  return (
                    <Pressable
                      key={row}
                      accessibilityRole="button"
                      accessibilityLabel={`${day} ${arabicMonthName(month)}${marks.length ? ` — ${marks[0].label}` : ""}`}
                      onPress={() => onSelectDate?.(iso)}
                      style={[
                        styles.cell,
                        row % 7 >= 5 && styles.weekendCell,
                        tint ? { backgroundColor: `${tint}22` } : null,
                        isSelected && styles.selectedCell,
                        isToday && styles.todayCell,
                      ]}
                    >
                      <Text style={[styles.dayText, tint ? { color: tint } : null, isToday && styles.todayText]}>
                        {arabicNumber(day)}
                      </Text>
                      {count > 0 ? <View style={styles.activityDot} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* قائمة المناسبات مكتوبةً — الشبكة تُري موضعها، وهذه تقول ما هي. */}
      <View style={styles.list}>
        <Text style={styles.listTitle}>مناسبات {arabicNumber(year)}</Text>
        {/* المناسبات الدينية تُحسب حسابًا، والعبرة بالرؤية: تقويمٌ يجزم بيوم
            العيد يخطئ في كل سنة يتأخّر فيها الهلال، ومن قرأه يخطّط على خطأ. */}
        <Text style={styles.listNote}>المناسبات الدينية بالحساب، والعبرة برؤية الهلال وإعلان السلطنة.</Text>
        {Object.entries(occasions)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([iso, items]) =>
            items.map((item) => (
              <Pressable
                key={`${iso}-${item.label}`}
                accessibilityRole="button"
                onPress={() => onSelectDate?.(iso)}
                style={styles.listRow}
              >
                <View style={[styles.listDot, { backgroundColor: OCCASION_TINT[item.kind] }]} />
                <Text style={styles.listLabel}>{item.label}</Text>
                <Text style={styles.listDate}>
                  {arabicNumber(Number(iso.slice(8)))} {arabicMonthName(Number(iso.slice(5, 7)) - 1)}
                </Text>
              </Pressable>
            ))
          )}
      </View>
    </View>
  );
}

const styles = themed(() => ({
  wrap: { gap: spacing.md },

  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  crest: { width: 46, height: 46 },
  bannerText: { flex: 1, gap: 1 },
  bannerTitle: { fontFamily: "Tajawal_700Bold", fontSize: 14.5, color: "#fff" },
  bannerSub: { fontFamily: "Tajawal_400Regular", fontSize: 11.5, color: "rgba(255,255,255,0.8)" },
  bannerYear: { fontFamily: "Tajawal_700Bold", fontSize: 30, color: "#fff", letterSpacing: 1 },

  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "center" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { ...typography.caption, fontSize: 11 },

  board: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm,
    overflow: "hidden",
  },
  dayNames: { width: 52 },
  headSpacer: { height: 30 },
  nameCell: { height: ROW_H, justifyContent: "center", paddingEnd: 4 },
  nameText: { ...typography.caption, fontSize: 9.5, textAlign: "left" },
  weekendCell: { backgroundColor: colors.background },
  weekendText: { color: colors.textMuted },

  columns: { flexDirection: "row" },
  column: { width: CELL, marginStart: 1 },
  monthHead: {
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  monthName: { fontFamily: "Tajawal_700Bold", fontSize: 9.5, color: colors.textOnPrimary },

  cell: {
    height: ROW_H,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dayText: { fontFamily: "Tajawal_500Medium", fontSize: 11.5, color: colors.textSecondary },
  todayCell: { backgroundColor: colors.primary },
  todayText: { color: colors.textOnPrimary, fontFamily: "Tajawal_700Bold" },
  selectedCell: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 4 },
  activityDot: {
    position: "absolute",
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.marine,
  },

  list: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  listTitle: { ...typography.h3, fontSize: 15 },
  listNote: { ...typography.caption, fontSize: 11, marginBottom: spacing.xs },
  listRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  listDot: { width: 7, height: 7, borderRadius: 4 },
  listLabel: { ...typography.body, fontSize: 13, flex: 1 },
  listDate: { ...typography.caption, fontSize: 11.5 },
}));
