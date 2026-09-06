import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CATEGORY_META, tintBackground } from "@/constants/categories";
import { colors, radius, spacing, typography } from "@/constants";
import type { Activity } from "@/types/models";
import { formatArabicDate, formatArabicTime } from "@/utils/date";
import { REGISTRATION_COLOR, REGISTRATION_LABEL } from "@/utils/registration";

interface ActivityListRowProps {
  activity: Activity;
  /** يعرض التاريخ بدل الوقت — مفيد في العرض السنوي. */
  showDate?: boolean;
  onPress?: () => void;
}

/** صف نشاط مضغوط بأيقونة ملوّنة — يُستخدم في التقويم وقوائم الأقسام. */
export function ActivityListRow({ activity, showDate, onPress }: ActivityListRowProps) {
  const meta = CATEGORY_META[activity.category];
  const statusColor = REGISTRATION_COLOR[activity.registrationStatus];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: tintBackground(meta.tint) }]}>
        <Ionicons name={meta.icon} size={19} color={meta.tint} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {activity.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {showDate ? formatArabicDate(activity.date) : formatArabicTime(activity.startTime)} · {activity.location}
        </Text>
      </View>
      <View style={[styles.pill, { backgroundColor: tintBackground(statusColor, 0.12) }]}>
        <Text style={[styles.pillText, { color: statusColor }]}>
          {REGISTRATION_LABEL[activity.registrationStatus]}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  pressed: { opacity: 0.85 },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1, gap: 2 },
  title: { ...typography.body, fontFamily: "Tajawal_500Medium" },
  meta: { ...typography.caption },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  pillText: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
});
