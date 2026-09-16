import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { FilterChips } from "@/components/FilterChips";
import { FlyPast } from "@/components/FlyPast";
import { ImageZoom } from "@/components/ImageZoom";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, shadow, spacing, typography, themed } from "@/constants";
import { FLIGHT_DAYS, FLIGHT_EFFECTIVE, FLIGHT_NOTICES, FLIGHT_SOURCE } from "@/constants/flights";
import type { Flight } from "@/constants/flights";
import { fetchFlightRoutes, fetchFlightSchedule } from "@/services/flightService";
import { formatArabicDate, formatArabicWeekday, omanTodayIso, omanWeekdayName } from "@/utils/date";

/**
 * جدول الرحلات مكتوبًا، مرتّبًا بالأيام.
 *
 * ويُفتح على يوم اليوم: من يفتح الشاشة يسأل «متى تقلع اليوم» لا «ماذا في
 * الأسبوع»، فيجد جوابه بلا لمسة. والجمعة لا رحلة فيها، فيُفتح على السبت.
 *
 * وتعبر طائرةٌ مرّةً واحدة عند الفتح ثم تختفي — تحيّةُ الشاشة لا زينتها.
 *
 * والتصميم هادئ عمدًا: لا حدودَ سوداء ولا أرقامًا غليظة. من يفتح الجدول
 * يبحث عن وقتٍ واحد، والصخبُ حوله يبطئ العثور عليه. فالبطاقة سطحٌ ناعم
 * بظلٍّ خفيف، والوقتُ متوسّط الوزن، واللونُ القويّ للمحطّة الوسطى وحدها.
 */
export default function FlightsScreen() {
  const today = omanWeekdayName();
  const initial = FLIGHT_DAYS.find((day) => day === today) ?? FLIGHT_DAYS[0];
  const [day, setDay] = useState<string>(initial);
  const [zoom, setZoom] = useState<string | null>(null);

  // الورقة الأصلية إن رُفعت — تُعرض أسفل المكتوب لمن أراد أن يقابل بينهما.
  const sheet = useQuery({ queryKey: ["flight-schedule"], queryFn: fetchFlightSchedule });
  const routes = useQuery({ queryKey: ["flight-routes"], queryFn: fetchFlightRoutes });

  const all = useMemo(() => routes.data ?? [], [routes.data]);
  const flights = useMemo(
    () => all.filter((flight) => flight.day === day && flight.stops.length > 0),
    [all, day]
  );
  // المحطّات بلا جدول ثابت: صفوف بلا يوم، لها نصّ بدل المسار.
  const notes = useMemo(() => all.filter((flight) => !flight.day && flight.note), [all]);

  // تنبيهات هذا اليوم التي لم ينقضِ تاريخها بعد.
  const todayIso = omanTodayIso();
  const notices = FLIGHT_NOTICES.filter((notice) => notice.day === day && notice.date >= todayIso);

  return (
    <View style={styles.screen}>
      {/* الرأس والمصدر وأيّام الأسبوع في شريطٍ واحد ناعم، والقائمة تحته. */}
      <View style={styles.band}>
        <ScreenHeader title="جدول الرحلات" />
        <View style={styles.head}>
          <Text style={styles.source}>{FLIGHT_SOURCE}</Text>
          <Text style={styles.effective}>{FLIGHT_EFFECTIVE}</Text>
        </View>
        <FilterChips
          items={FLIGHT_DAYS.map((entry) => ({
            key: entry,
            label: entry === today ? `${entry} · اليوم` : entry,
          }))}
          activeKey={day}
          onChange={setDay}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {notices.map((notice) => (
          <View key={`${notice.date}-${notice.station}`} style={styles.notice}>
            <View style={styles.noticeHead}>
              <View style={styles.noticeIcon}>
                <Ionicons name="alert-circle" size={18} color={colors.textOnPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.noticeTitle}>تغيير توقيت رحلة {notice.station}</Text>
                <Text style={styles.noticeDate}>
                  {formatArabicWeekday(notice.date)} · {formatArabicDate(notice.date)}
                </Text>
              </View>
            </View>
            {notice.legs.map((leg) => (
              <View key={leg.from} style={styles.legRow}>
                <Text style={styles.legFrom}>من {leg.from}</Text>
                <View style={styles.legTimes}>
                  <Text style={styles.legTime}>
                    <Text style={styles.legLabel}>التسجيل </Text>
                    {leg.checkIn}
                  </Text>
                  <Text style={styles.legTime}>
                    <Text style={styles.legLabel}>الإقلاع </Text>
                    {leg.depart}
                  </Text>
                </View>
              </View>
            ))}
            <Text style={styles.noticeFoot}>يُعمل بهذا التوقيت لهذا اليوم فقط، ثم يعود الجدول المعتاد.</Text>
          </View>
        ))}

        {flights.length > 0 ? (
          flights.map((flight) => (
            <FlightCard
              key={flight.id ?? `${flight.station}-${flight.day}`}
              flight={flight}
              changed={notices.some((notice) => notice.station === flight.station)}
            />
          ))
        ) : (
          <View style={styles.none}>
            <View style={styles.noneIcon}>
              <Ionicons name="airplane-outline" size={22} color={colors.textMuted} />
            </View>
            <Text style={styles.noneText}>لا رحلات يوم {day}</Text>
          </View>
        )}

        {notes.length > 0 ? (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>محطّات بلا جدول ثابت</Text>
            {notes.map((entry) => (
              <View key={entry.id ?? entry.station} style={styles.noteRow}>
                <Text style={styles.notePlace}>{entry.station}</Text>
                <Text style={styles.noteText}>{entry.note}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {sheet.data && sheet.data.images.length > 0 ? (
          <View style={styles.sheetBlock}>
            <Text style={styles.notesTitle}>الورقة الأصلية</Text>
            <Text style={styles.noteText}>المس الصورة لتكبيرها.</Text>
            {sheet.data.images.map((image) => (
              <Pressable key={image} accessibilityRole="button" onPress={() => setZoom(image)}>
                <Image source={{ uri: image }} style={styles.sheetImage} resizeMode="contain" />
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <ImageZoom uri={zoom} onClose={() => setZoom(null)} />

      {/* طائرةٌ تعبر مرّةً واحدة عند فتح الشاشة ثم تختفي — وهي آخر عنصر
          ليمرّ فوق البطاقات لا تحتها. */}
      <FlyPast />
    </View>
  );
}

/**
 * رحلة واحدة: الوجهة والطائرة، ثم المحطّات الثلاث بأوقاتها.
 *
 * والوصول والإقلاع مفصولان بكلمتيهما لا بعمودين من الأرقام كما في الورقة:
 * الورقة تُقرأ بمعرفة أن الأيسر وصولٌ والأيمن إقلاع، ومن لا يعرف ذلك يقرأ
 * رقمًا مكان رقم — ويصل بعد أن تُقلع.
 */
function FlightCard({ flight, changed }: { flight: Flight; changed?: boolean }) {
  return (
    <View style={[styles.card, changed && styles.cardChanged]}>
      <View style={styles.cardHead}>
        <View style={styles.icon}>
          <Ionicons name="airplane-outline" size={17} color={colors.primary} />
        </View>
        <Text style={styles.station}>{flight.station}</Text>
        {changed ? <Text style={styles.changedTag}>تغيّر اليوم — انظر التنبيه</Text> : null}
        <Text style={styles.aircraft}>{flight.aircraft}</Text>
      </View>

      {flight.stops.map((stop, index) => (
        <View key={`${stop.place}-${index}`} style={styles.stop}>
          <View style={styles.dotColumn}>
            <View style={[styles.dot, index === 1 && styles.dotMid]} />
            {index < flight.stops.length - 1 ? <View style={styles.line} /> : null}
          </View>
          <Text style={styles.place}>{stop.place}</Text>
          <View style={styles.times}>
            {stop.arrive ? (
              <Text style={styles.time}>
                <Text style={styles.timeLabel}>وصول </Text>
                {stop.arrive}
              </Text>
            ) : null}
            {stop.depart ? (
              <Text style={styles.time}>
                <Text style={styles.timeLabel}>إقلاع </Text>
                {stop.depart}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = themed(() => ({
  screen: { flex: 1, backgroundColor: colors.background },
  band: {
    backgroundColor: colors.surface,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    ...shadow.subtle,
  },
  head: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: 2 },
  source: { ...typography.caption, lineHeight: 18, color: colors.textSecondary },
  effective: { ...typography.caption, fontSize: 11 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow.subtle,
  },
  cardChanged: { opacity: 0.62 },
  changedTag: {
    ...typography.caption,
    fontSize: 10.5,
    color: colors.warning,
    backgroundColor: colors.warningSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.xs },
  notice: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow.card,
  },
  noticeHead: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.xs },
  noticeIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  noticeTitle: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: colors.textOnPrimary },
  noticeDate: { ...typography.caption, color: colors.textOnPrimaryMuted },
  legRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  legFrom: { fontFamily: "Tajawal_500Medium", fontSize: 14, color: colors.textOnPrimary, width: 84 },
  legTimes: { flex: 1, flexDirection: "row", justifyContent: "flex-end", gap: spacing.lg },
  legTime: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: colors.textOnPrimary, writingDirection: "ltr" },
  legLabel: { fontFamily: "Tajawal_400Regular", fontSize: 11, color: colors.textOnPrimaryMuted },
  noticeFoot: { ...typography.caption, fontSize: 11.5, color: colors.textOnPrimaryMuted, marginTop: 2 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  station: { ...typography.body, flex: 1, fontFamily: "Tajawal_700Bold", fontSize: 16 },
  aircraft: {
    ...typography.caption,
    fontSize: 11,
    writingDirection: "ltr",
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  stop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  dotColumn: { alignItems: "center", width: 12, paddingTop: 7 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotMid: { backgroundColor: colors.marine, width: 10, height: 10, borderRadius: 5 },
  line: { width: 1.5, flex: 1, minHeight: 18, backgroundColor: colors.border, borderRadius: 1 },
  place: { ...typography.body, fontSize: 14, width: 74, color: colors.textSecondary },
  times: { flex: 1, flexDirection: "row", justifyContent: "flex-end", gap: spacing.lg },
  time: { ...typography.body, fontSize: 14.5, fontFamily: "Tajawal_500Medium", writingDirection: "ltr" },
  timeLabel: { ...typography.caption, fontSize: 11, fontFamily: "Tajawal_400Regular" },
  none: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xxl },
  noneIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.subtle,
  },
  noneText: { ...typography.caption },
  notes: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.sm,
    ...shadow.subtle,
  },
  notesTitle: { ...typography.body, fontFamily: "Tajawal_700Bold" },
  noteRow: { flexDirection: "row", gap: spacing.md },
  notePlace: { ...typography.caption, color: colors.textPrimary, width: 74 },
  noteText: { ...typography.caption, flex: 1, lineHeight: 20 },
  sheetBlock: { gap: spacing.sm, marginTop: spacing.sm },
  sheetImage: {
    width: "100%",
    height: 260,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
}));
