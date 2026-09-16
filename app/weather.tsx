import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "@/components/BottomSheet";
import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";
import { tintBackground } from "@/constants/categories";
import { PLACES } from "@/constants/places";
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
} from "@/utils/weather";

/**
 * الطقس حيث أنت.
 *
 * والشاشة تقول دائمًا لأيّ مكانٍ هذا الطقس — بالاسم وبمصدره: موقعك أم مكان
 * اخترته. وطقسٌ بلا مكان يُقرأ على أنه طقس «هنا» أينما كنت، وهو أسوأ من
 * لا طقس لمن يخطّط لرحلة أو لتمرين في العراء.
 */
export default function WeatherScreen() {
  const place = useWeatherPlace();
  const coords = place.data?.status === "ok" ? place.data.coords : null;
  const forecast = useForecast(coords);
  const manualPlace = useWeatherStore((state) => state.manualPlace);
  const setManualPlace = useWeatherStore((state) => state.setManualPlace);
  const [picking, setPicking] = useState(false);

  const data = forecast.data;
  const look = data ? describeWeather(data.code, data.isNight) : null;
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

  return (
    <View style={styles.screen}>
      <ScreenHeader title="الطقس" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* المكان ومصدره — وزرّ التبديل إلى مكان آخر، في متناول الإبهام. */}
        <Pressable accessibilityRole="button" onPress={() => setPicking(true)} style={styles.placeRow}>
          <Ionicons name="location-outline" size={18} color={colors.primary} />
          <Text style={styles.placeName}>
            {place.data?.status === "ok" ? place.data.label : "تحديد المكان…"}
          </Text>
          {/* ولا يُكتب «مكان مختار» حين يتعذّر تحديد الموقع: لم يُختر شيء بعد،
              والسطر يقول حينها ما يُغني عن كذبٍ صغير — لا شيء. */}
          <Text style={styles.placeSource}>
            {place.data?.status !== "ok" ? "" : place.data.manual ? "مكان مختار" : "موقعك الحالي"}
          </Text>
          <Ionicons name="chevron-back" size={16} color={colors.textMuted} />
        </Pressable>

        {place.data && place.data.status !== "ok" ? (
          <LocationProblem status={place.data.status} onRetry={() => place.refetch()} onPick={() => setPicking(true)} />
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

        {data && look ? (
          <>
            <View style={styles.hero}>
              <View style={[styles.heroIcon, { backgroundColor: tintBackground(look.tint, 0.14) }]}>
                <Ionicons name={look.icon} size={44} color={look.tint} />
              </View>
              <Text style={styles.heroTemp}>{tempLabel(data.temperature)}</Text>
              <Text style={styles.heroLabel}>{look.label}</Text>
              {/* بالكلمات لا بالسهام: «٣١°↑ / ٢٦°↓» في سطر عربي يعيد ترتيب
                  نفسه فتقرأ العين الصغرى مكان العظمى. والكلمة لا تنقلب. */}
              <View style={styles.heroRange}>
                <Text style={styles.rangeText}>
                  العظمى {tempLabel(data.todayMax)} · الصغرى {tempLabel(data.todayMin)}
                </Text>
                <Text style={styles.rangeText}>الحرارة كأنها {tempLabel(data.apparent)}</Text>
              </View>
            </View>

            {/* الساعات القادمة — تبدأ من الساعة الحالية للمكان لا من أوّل اليوم. */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>الساعات القادمة</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hoursRow}>
                {hours.map((point) => {
                  const hourLook = describeWeather(point.code, point.isNight);
                  return (
                    <View key={point.time} style={styles.hourCell}>
                      <Text style={styles.hourTime}>{hourLabel(point.hour)}</Text>
                      <Ionicons name={hourLook.icon} size={22} color={hourLook.tint} />
                      <Text style={styles.hourTemp}>{tempLabel(point.temperature)}</Text>
                      <Text style={styles.hourRain}>
                        {point.precipitation > 0 ? `${arabicNumber(point.precipitation)}٪` : "—"}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.factRow}>
              <Fact icon="water-outline" label="الرطوبة" value={`${arabicNumber(Math.round(data.humidity))}٪`} />
              <Fact icon="navigate-outline" label="الرياح" value={`${arabicNumber(Math.round(data.windSpeed))} كم/س`} />
            </View>
            <View style={styles.factRow}>
              <Fact icon="sunny-outline" label="الشروق" value={clockOf(data.sunrise)} />
              <Fact icon="moon-outline" label="الغروب" value={clockOf(data.sunset)} />
            </View>

            {days.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>الأيام القادمة</Text>
                {days.map((day) => {
                  const dayLook = describeWeather(day.code);
                  return (
                    <View key={day.date} style={styles.dayRow}>
                      <Text style={styles.dayName}>{omanWeekdayName(new Date(`${day.date}T09:00:00`))}</Text>
                      <Ionicons name={dayLook.icon} size={20} color={dayLook.tint} />
                      <Text style={styles.dayLabel} numberOfLines={1}>
                        {dayLook.label}
                      </Text>
                      <Text style={styles.dayTemps}>{tempLabel(day.max)}</Text>
                      <Text style={styles.dayMin}>{tempLabel(day.min)}</Text>
                    </View>
                  );
                })}
              </View>
            ) : null}

            <Text style={styles.source}>
              المصدر: Open-Meteo · حُدّث {clockOf(data.observedAt)} بتوقيت المكان
            </Text>
          </>
        ) : null}

        {!data && !forecast.isError && place.data?.status === "ok" ? (
          <EmptyState icon="partly-sunny-outline" title="يُجلب الطقس…" />
        ) : null}
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

function Fact({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },

  placeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  placeName: { ...typography.body, fontFamily: "Tajawal_700Bold" },
  placeSource: { ...typography.caption, flex: 1, textAlign: "left", color: colors.textMuted },

  hero: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  heroIcon: {
    width: 84,
    height: 84,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  heroTemp: { fontFamily: "Tajawal_700Bold", fontSize: 58, lineHeight: 70, color: colors.textPrimary },
  heroLabel: { ...typography.h3, color: colors.textSecondary },
  heroRange: { alignItems: "center", gap: 2, marginTop: spacing.sm },
  rangeText: { ...typography.bodyMuted },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  cardTitle: { ...typography.h3 },

  hoursRow: { gap: spacing.lg, paddingHorizontal: 2 },
  hourCell: { alignItems: "center", gap: 6, minWidth: 48 },
  hourTime: { ...typography.caption },
  hourTemp: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: colors.textPrimary },
  hourRain: { ...typography.caption, fontSize: 10, color: colors.info },

  factRow: { flexDirection: "row", gap: spacing.md },
  fact: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  factLabel: { ...typography.caption, flex: 1 },
  factValue: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: colors.textPrimary },

  dayRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  dayName: { ...typography.body, width: 62 },
  dayLabel: { ...typography.bodyMuted, flex: 1 },
  dayTemps: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: colors.textPrimary, minWidth: 34, textAlign: "left" },
  dayMin: { ...typography.caption, minWidth: 30, textAlign: "left" },

  source: { ...typography.caption, textAlign: "center", marginTop: spacing.sm },

  problem: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
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
});
