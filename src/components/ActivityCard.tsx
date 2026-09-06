import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CATEGORY_META } from "@/constants/categories";
import { colors, radius, shadow, spacing, typography } from "@/constants";
import type { Activity } from "@/types/models";
import { formatArabicDate, formatArabicTime } from "@/utils/date";
import { REGISTRATION_COLOR, REGISTRATION_LABEL } from "@/utils/registration";

interface ActivityCardProps {
  activity: Activity;
  onPress?: () => void;
}

/** بطاقة أفقية موحّدة لأي نشاط (مسابقة، محاضرة، رياضة، رماية...). */
export function ActivityCard({ activity, onPress }: ActivityCardProps) {
  const meta = CATEGORY_META[activity.category];
  const statusColor = REGISTRATION_COLOR[activity.registrationStatus];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, shadow.card, pressed && styles.pressed]}
    >
      <View style={styles.thumb}>
        <Ionicons name={meta.icon} size={28} color={colors.primary} />
      </View>
      <Text style={styles.categoryLabel}>{meta.label}</Text>
      <Text style={styles.title} numberOfLines={2}>
        {activity.title}
      </Text>
      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
        <Text style={styles.metaText}>{formatArabicDate(activity.date)}</Text>
        <Text style={styles.metaDot}>•</Text>
        <Text style={styles.metaText}>{formatArabicTime(activity.startTime)}</Text>
      </View>
      <View style={[styles.statusPill, { backgroundColor: `${statusColor}1A` }]}>
        <Text style={[styles.statusText, { color: statusColor }]}>
          {REGISTRATION_LABEL[activity.registrationStatus]}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 200,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  pressed: { opacity: 0.85 },
  thumb: {
    height: 88,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  categoryLabel: { ...typography.caption, marginBottom: 2 },
  title: { ...typography.h3, marginBottom: spacing.sm, minHeight: 44 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: spacing.sm },
  metaText: { ...typography.caption },
  metaDot: { color: colors.textMuted },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusText: { fontFamily: "Tajawal_500Medium", fontSize: 12 },
});
