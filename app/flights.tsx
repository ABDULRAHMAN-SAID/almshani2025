import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { FilterChips } from "@/components/FilterChips";
import { FlyPast } from "@/components/FlyPast";
import { ImageZoom } from "@/components/ImageZoom";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";
import { FLIGHT_DAYS, FLIGHT_EFFECTIVE, FLIGHT_SOURCE } from "@/constants/flights";
import type { Flight } from "@/constants/flights";
import { fetchFlightRoutes, fetchFlightSchedule } from "@/services/flightService";
import { omanWeekdayName } from "@/utils/date";

/**
 * جدول الرحلات مكتوبًا، مرتّبًا بالأيام.
 *
 * ويُفتح على يوم اليوم: من يفتح الشاشة يسأل «متى تقلع اليوم» لا «ماذا في
 * الأسبوع»، فيجد جوابه بلا لمسة. والجمعة لا رحلة فيها، فيُفتح على السبت.
 *
 * وتعبر طائرةٌ مرّةً واحدة عند الفتح ثم تختفي — تحيّةُ الشاشة لا زينتها.
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

  return (
    <View style={styles.screen}>
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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {flights.length > 0 ? (
          flights.map((flight) => (
            <FlightCard key={flight.id ?? `${flight.station}-${flight.day}`} flight={flight} />
          ))
        ) : (
          <View style={styles.none}>
            <Ionicons name="airplane-outline" size={22} color={colors.textMuted} />
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
function FlightCard({ flight }: { flight: Flight }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.icon}>
          <Ionicons name="airplane-outline" size={17} color={colors.primary} />
        </View>
        <Text style={styles.station}>{flight.station}</Text>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  head: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: 2 },
  source: { ...typography.caption, lineHeight: 18 },
  effective: { ...typography.caption, fontSize: 11, color: colors.primary },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  icon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: "rgba(11,37,69,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  station: { ...typography.body, flex: 1, fontFamily: "Tajawal_700Bold" },
  aircraft: { ...typography.caption, fontSize: 11, writingDirection: "ltr" },
  stop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  dotColumn: { alignItems: "center", width: 12, paddingTop: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotMid: { backgroundColor: colors.primary },
  line: { width: 1, flex: 1, minHeight: 16, backgroundColor: colors.border },
  place: { ...typography.body, fontSize: 14, width: 74 },
  times: { flex: 1, flexDirection: "row", justifyContent: "flex-end", gap: spacing.lg },
  time: { ...typography.body, fontSize: 14, fontFamily: "Tajawal_700Bold", writingDirection: "ltr" },
  timeLabel: { ...typography.caption, fontSize: 11, fontFamily: "Tajawal_400Regular" },
  none: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  noneText: { ...typography.caption },
  notes: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.sm,
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
    borderWidth: 1,
    borderColor: colors.border,
  },
});
