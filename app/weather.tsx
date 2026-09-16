import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheet } from "@/components/BottomSheet";
import { PatternOverlay } from "@/components/PatternOverlay";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { WeatherScene } from "@/components/WeatherScene";
import { colors, radius, shadow, spacing, typography, themed } from "@/constants";
import { tintBackground } from "@/constants/categories";
import { PLACES } from "@/constants/places";
import { skyFor } from "@/constants/weatherSky";
import { useForecast, useWeatherPlace } from "@/hooks/useWeather";
import { useWeatherStore } from "@/store/weatherStore";
import { omanWeekdayName } from "@/utils/date";
import {
  arabicNumber,
  comingDays,
  describeWeather,
  hourLabel,
  nextHours,
  tempLabel,
  type DayPoint,
  type HourPoint,
} from "@/utils/weather";

/**
 * الطقس حيث أنت.
 *
 * والسماء خلف الرقم ليست زينة: اللون أوّل ما تقرؤه العين، فيعرف من فتح
 * الشاشة أنّ الدنيا صحوٌ أو مطرٌ أو ليل قبل أن يقرأ حرفًا. وشاشةٌ بيضاء
 * تعرض «٣٠°» تقول الرقم ولا تقول الجوّ.
 */
export default function WeatherScreen() {
  const insets = useSafeAreaInsets();
  const place = useWeatherPlace();
  const coords = place.data?.status === "ok" ? place.data.coords : null;
  const forecast = useForecast(coords);
  const manualPlace = useWeatherStore((state) => state.manualPlace);
  const setManualPlace = useWeatherStore((state) => state.setManualPlace);
  const [picking, setPicking] = useState(false);

  const data = forecast.data;
  const look = data ? describeWeather(data.code, data.isNight) : null;
  const sky = skyFor(data?.code ?? 0, data?.isNight ?? false);
  const hours = useMemo(() => (data ? nextHours(data, 12) : []), [data]);
  const days = useMemo(() => (data ? comingDays(data, 5) : []), [data]);

  const refreshing = place.isFetching || forecast.isFetching;
  const onRefresh = async () => {
    const next = await place.refetch();
    if (next.data?.status === "ok") await forecast.refetch();
  };

  const choose = (key: string | null) => {
    setManualPlace(key);
    setPicking(false);
  };

  const label = place.data?.status === "ok" ? place.data.label : "تحديد المكان…";
  const source =
    place.data?.status !== "ok" ? "" : place.data.manual ? "مكان مختار" : "موقعك الحالي";

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* السماء: الرأس والمكان والدرجة في لوحٍ واحد ملوّن بحالة الجوّ. */}
        <LinearGradient colors={sky.colors} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.sky}>
          <PatternOverlay />
          <ScreenHeader title="الطقس" onDark />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="تغيير المكان"
            onPress={() => setPicking(true)}
            style={({ pressed }) => [styles.placeChip, pressed && styles.pressed]}
          >
            <Ionicons name="location" size={14} color="#fff" />
            <Text style={styles.placeName}>{label}</Text>
            {source ? <Text style={[styles.placeSource, { color: sky.muted }]}>· {source}</Text> : null}
            <Ionicons name="chevron-down" size={14} color={sky.muted} />
          </Pressable>

          {data && look ? (
            <View style={styles.heroBody}>
              {/* مشهدٌ لا أيقونة: الأيقونة تقول الحالة، والمشهد يقول الإحساس بها. */}
              <WeatherScene code={data.code} isNight={data.isNight} windSpeed={data.windSpeed} />
              <View style={styles.tempRow}>
                <Text style={styles.heroTemp}>{tempLabel(data.temperature)}</Text>
              </View>
              <Text style={styles.heroLabel}>{look.label}</Text>

              <View style={styles.statRow}>
                <Stat muted={sky.muted} label="العظمى" value={tempLabel(data.todayMax)} />
                <View style={[styles.statLine, { backgroundColor: sky.muted }]} />
                <Stat muted={sky.muted} label="الصغرى" value={tempLabel(data.todayMin)} />
                <View style={[styles.statLine, { backgroundColor: sky.muted }]} />
                <Stat muted={sky.muted} label="كأنها" value={tempLabel(data.apparent)} />
              </View>
            </View>
          ) : (
            <View style={styles.heroEmpty}>
              <Text style={[styles.heroLabel, { color: sky.muted }]}>
                {forecast.isError ? "تعذّر جلب الطقس" : "يُجلب الطقس…"}
              </Text>
            </View>
          )}
        </LinearGradient>

        <View style={styles.body}>
          {place.data && place.data.status !== "ok" ? (
            <LocationProblem
              status={place.data.status}
              onRetry={() => place.refetch()}
              onPick={() => setPicking(true)}
            />
          ) : null}

          {forecast.isError ? (
            <View style={styles.problem}>
              <Ionicons name="cloud-offline-outline" size={22} color={colors.warning} />
              <Text style={styles.problemText}>
                {forecast.error instanceof Error ? forecast.error.message : "تعذّر جلب الطقس"}
              </Text>
              <PrimaryButton label="أعد المحاولة" onPress={() => forecast.refetch()} />
            </View>
          ) : null}

          {data ? (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>الساعات القادمة</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hoursRow}>
                  {hours.map((point) => (
                    <HourCell key={point.time} point={point} hours={hours} />
                  ))}
                </ScrollView>
              </View>

              <View style={styles.tiles}>
                <Tile icon="water-outline" tint="#2C7A7B" label="الرطوبة" value={`${arabicNumber(Math.round(data.humidity))}٪`} />
                <Tile icon="navigate-outline" tint="#2C5282" label="الرياح" value={`${arabicNumber(Math.round(data.windSpeed))}`} unit="كم/س" />
              </View>
              <View style={styles.tiles}>
                <Tile icon="partly-sunny-outline" tint="#B7791F" label="الشروق" value={clockOf(data.sunrise)} />
                <Tile icon="moon-outline" tint="#434190" label="الغروب" value={clockOf(data.sunset)} />
              </View>

              {days.length > 0 ? (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>الأيام القادمة</Text>
                  <View style={{ gap: spacing.md }}>
                    {days.map((day) => (
                      <DayRow key={day.date} day={day} days={days} />
                    ))}
                  </View>
                </View>
              ) : null}

              <Text style={styles.source}>
                المصدر: Open-Meteo · حُدّث {clockOf(data.observedAt)} بتوقيت المكان
              </Text>
            </>
          ) : null}
        </View>
      </ScrollView>

      <BottomSheet visible={picking} onClose={() => setPicking(false)}>
        <Text style={styles.sheetTitle}>اختر المكان</Text>
        <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
          <PlaceRow
            label="اتبع موقعي"
            hint="يتغيّر الطقس كلّما انتقلت"
            icon="locate-outline"
            active={manualPlace === null}
            onPress={() => choose(null)}
          />
          {PLACES.map((item) => (
            <PlaceRow
              key={item.key}
              label={item.name}
              hint={item.base ? "قاعدة" : undefined}
              icon="location-outline"
              active={manualPlace === item.key}
              onPress={() => choose(item.key)}
            />
          ))}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

/* ------------------------------ أجزاء ------------------------------ */

function Stat({ label, value, muted }: { label: string; value: string; muted: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: muted }]}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

/**
 * خليّة ساعة: الحرارة عمودًا لا رقمًا وحده.
 *
 * اثنتا عشرة درجةً متقاربة تُقرأ سطرًا من الأرقام لا منحنى يوم. والعمود
 * يُظهر أين يعلو الحرّ وأين ينزل بلمحة، والرقم فوقه لمن أراد الدقّة.
 */
function HourCell({ point, hours }: { point: HourPoint; hours: HourPoint[] }) {
  const look = describeWeather(point.code, point.isNight);
  const temps = hours.map((hour) => hour.temperature);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const span = Math.max(1, max - min);
  // بين ١٤ و٤٦: عمودٌ لا يختفي عند أبرد ساعة ولا يطغى عند أحرّها.
  const height = 14 + ((point.temperature - min) / span) * 32;

  return (
    <View style={styles.hourCell}>
      <Text style={styles.hourTime}>{hourLabel(point.hour)}</Text>
      <Ionicons name={look.icon} size={20} color={look.tint} />
      <Text style={styles.hourTemp}>{tempLabel(point.temperature)}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.bar, { height, backgroundColor: look.tint }]} />
      </View>
      <Text style={[styles.hourRain, point.precipitation === 0 && styles.hourRainOff]}>
        {point.precipitation > 0 ? `${arabicNumber(point.precipitation)}٪` : "—"}
      </Text>
    </View>
  );
}

/**
 * صفّ يوم: شريط يصل بين صغراه وعظماه.
 *
 * ورقمان متجاوران لا يقولان إن كان الغد أحرّ أم أبرد إلا بالحساب. والشريط
 * يقوله بموضعه: من كان شريطه أبعد إلى اليمين فهو الأحرّ.
 */
function DayRow({ day, days }: { day: DayPoint; days: DayPoint[] }) {
  const look = describeWeather(day.code);
  const lows = days.map((item) => item.min);
  const highs = days.map((item) => item.max);
  const floor = Math.min(...lows);
  const ceiling = Math.max(...highs);
  const span = Math.max(1, ceiling - floor);
  const start = ((day.min - floor) / span) * 100;
  const width = Math.max(8, ((day.max - day.min) / span) * 100);

  return (
    <View style={styles.dayRow}>
      <Text style={styles.dayName}>{omanWeekdayName(new Date(`${day.date}T09:00:00`))}</Text>
      <Ionicons name={look.icon} size={19} color={look.tint} />
      <Text style={styles.dayMin}>{tempLabel(day.min)}</Text>
      <View style={styles.rangeTrack}>
        <View style={[styles.rangeFill, { start: `${start}%`, width: `${width}%`, backgroundColor: look.tint }]} />
      </View>
      <Text style={styles.dayMax}>{tempLabel(day.max)}</Text>
    </View>
  );
}

function Tile({
  icon,
  tint,
  label,
  value,
  unit,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <View style={[styles.tile, shadow.subtle]}>
      <View style={[styles.tileIcon, { backgroundColor: tintBackground(tint, 0.12) }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={styles.tileLabel}>{label}</Text>
      <View style={styles.tileValueRow}>
        <Text style={styles.tileValue}>{value}</Text>
        {unit ? <Text style={styles.tileUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

/** الساعة من وقت المزوّد، بالأرقام العربية: «٥:٤٩ ص». */
function clockOf(iso: string): string {
  const match = /T(\d{2}):(\d{2})/.exec(iso ?? "");
  if (!match) return "—";
  const hour = Number(match[1]);
  const half = hour % 12 === 0 ? 12 : hour % 12;
  return `${arabicNumber(half)}:${arabicNumber(match[2])} ${hour >= 12 ? "م" : "ص"}`;
}

function LocationProblem({
  status,
  onRetry,
  onPick,
}: {
  status: "denied" | "off" | "unavailable" | "error";
  onRetry: () => void;
  onPick: () => void;
}) {
  // ولكلٍّ علاجه: المرفوض يُعالج من إعدادات التطبيق، والمطفأ من شريط الجهاز.
  const text =
    status === "denied"
      ? "لم يُسمح للتطبيق بمعرفة موقعك. اسمح له من إعدادات الهاتف، أو اختر مكانك بنفسك."
      : status === "off"
        ? "خدمة الموقع مطفأة في الجهاز. شغّلها من شريط الإعدادات، أو اختر مكانك بنفسك."
        : status === "unavailable"
          ? "تحديد الموقع يحتاج نسخة أحدث من التطبيق. حمّلها من صفحة التحميل، وإلى حينها اختر مكانك بنفسك."
          : "تعذّر تحديد موقعك الآن. أعد المحاولة، أو اختر مكانك بنفسك.";
  return (
    <View style={styles.problem}>
      <Ionicons name="location-outline" size={22} color={colors.warning} />
      <Text style={styles.problemText}>{text}</Text>
      <View style={styles.problemButtons}>
        <PrimaryButton label="أعد المحاولة" onPress={onRetry} style={styles.problemButton} />
        <Pressable accessibilityRole="button" onPress={onPick} style={styles.secondaryButton}>
          <Text style={styles.secondaryLabel}>اختر مكانًا</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PlaceRow({
  label,
  hint,
  icon,
  active,
  onPress,
}: {
  label: string;
  hint?: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.placeOption, active && styles.placeActive]}>
      <Ionicons name={icon} size={18} color={active ? colors.primary : colors.textMuted} />
      <Text style={[styles.placeOptionLabel, active && styles.placeOptionActive]}>{label}</Text>
      {hint ? <Text style={styles.placeHint}>{hint}</Text> : null}
      {active ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
    </Pressable>
  );
}

const styles = themed(() => ({
  screen: { flex: 1, backgroundColor: colors.background },

  sky: {
    paddingBottom: spacing.xxl + spacing.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  placeChip: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.14)",
    maxWidth: "90%",
  },
  pressed: { opacity: 0.85 },
  placeName: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: "#fff" },
  placeSource: { fontFamily: "Tajawal_400Regular", fontSize: 12 },

  heroBody: { alignItems: "center", marginTop: spacing.lg },
  heroEmpty: { alignItems: "center", paddingVertical: spacing.xxl },
  tempRow: { flexDirection: "row", alignItems: "flex-start" },
  heroTemp: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 76,
    lineHeight: 92,
    color: "#fff",
    letterSpacing: -1,
  },
  heroLabel: { fontFamily: "Tajawal_500Medium", fontSize: 17, color: "#fff", marginTop: -spacing.sm },

  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  stat: { alignItems: "center", gap: 2, minWidth: 54 },
  statLabel: { fontFamily: "Tajawal_400Regular", fontSize: 12 },
  statValue: { fontFamily: "Tajawal_700Bold", fontSize: 17, color: "#fff" },
  statLine: { width: 1, height: 26, opacity: 0.35 },

  // البطاقات تصعد فوق حافّة السماء قليلًا، فيبدو اللوحان طبقتين لا شريطين.
  body: { paddingHorizontal: spacing.lg, gap: spacing.md, marginTop: -spacing.xl },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg + 4,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.subtle,
  },
  cardTitle: { ...typography.h3, fontSize: 15 },

  hoursRow: { gap: spacing.lg, paddingHorizontal: 2, alignItems: "flex-end" },
  hourCell: { alignItems: "center", gap: 6, minWidth: 46 },
  hourTime: { ...typography.caption, fontSize: 11 },
  hourTemp: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: colors.textPrimary },
  barTrack: { height: 46, justifyContent: "flex-end" },
  bar: { width: 6, borderRadius: 3, opacity: 0.85 },
  hourRain: { fontFamily: "Tajawal_500Medium", fontSize: 10.5, color: colors.info },
  hourRainOff: { color: colors.border },

  tiles: { flexDirection: "row", gap: spacing.md },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
  },
  tileIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  tileLabel: { ...typography.caption, fontSize: 11.5 },
  tileValueRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  tileValue: { fontFamily: "Tajawal_700Bold", fontSize: 19, color: colors.textPrimary },
  tileUnit: { ...typography.caption, fontSize: 11 },

  dayRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dayName: { ...typography.body, fontSize: 13.5, width: 58 },
  dayMin: { ...typography.caption, fontSize: 12.5, width: 34, textAlign: "center" },
  dayMax: { fontFamily: "Tajawal_700Bold", fontSize: 13.5, color: colors.textPrimary, width: 34, textAlign: "center" },
  rangeTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.backgroundDeep,
    overflow: "hidden",
  },
  rangeFill: { position: "absolute", top: 0, bottom: 0, borderRadius: 3, opacity: 0.85 },

  source: { ...typography.caption, textAlign: "center", marginTop: spacing.xs },

  problem: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: "center",
  },
  problemText: { ...typography.body, textAlign: "center", color: colors.textSecondary },
  problemButtons: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  problemButton: { flexShrink: 1 },
  secondaryButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  secondaryLabel: { fontFamily: "Tajawal_500Medium", fontSize: 14, color: colors.primary },

  sheetTitle: { ...typography.h2, marginBottom: spacing.md, textAlign: "center" },
  sheetList: { maxHeight: 380 },
  placeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  placeActive: { backgroundColor: colors.backgroundDeep },
  placeOptionLabel: { ...typography.body, flex: 1 },
  placeOptionActive: { fontFamily: "Tajawal_700Bold" },
  placeHint: { ...typography.caption, color: colors.textMuted },
}));
