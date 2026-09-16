import { Pressable, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "@/constants";
import { useWeather } from "@/hooks/useWeather";
import { describeWeather, tempLabel } from "@/utils/weather";

/**
 * سطر الطقس في الصفحة الرئيسية — الدرجة والمكان، ويُفتح على التفصيل.
 *
 * ولا يظهر إلا حين يكون عنده ما يقوله: بلا إذن موقع، أو بلا شبكة، أو قبل أن
 * يصل الردّ، لا يُرسم شيء. وبطاقةٌ تقول «تعذّر جلب الطقس» في أعلى الصفحة
 * الرئيسية تُقلق من يفتح التطبيق لأمرٍ آخر، ولا تفيده بشيء.
 */
export function WeatherChip() {
  const { forecast, label } = useWeather();
  const data = forecast.data;
  if (!data || !label) return null;
  const look = describeWeather(data.code, data.isNight);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`الطقس في ${label}: ${look.label}`}
      onPress={() => router.push("/weather")}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
      hitSlop={6}
    >
      <Ionicons name={look.icon} size={15} color={colors.textOnPrimary} />
      <Text style={styles.temp}>{tempLabel(data.temperature)}</Text>
      <Text style={styles.place} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.12)",
    maxWidth: 150,
  },
  pressed: { opacity: 0.8 },
  temp: { fontFamily: "Tajawal_700Bold", fontSize: 12.5, color: colors.textOnPrimary },
  place: { ...typography.caption, fontSize: 11, color: colors.textOnPrimaryMuted, flexShrink: 1 },
});
