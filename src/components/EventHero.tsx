import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { CATEGORY_META } from "@/constants/categories";
import { colors, radius, spacing, typography } from "@/constants";
import type { Activity } from "@/types/models";
import { formatArabicTime, relativeDayLabel } from "@/utils/date";
import { PatternOverlay } from "./PatternOverlay";
import { PrimaryButton } from "./PrimaryButton";
import { SecondaryButton } from "./SecondaryButton";

interface EventHeroProps {
  activity: Activity;
  onViewDetails?: () => void;
  onRegister?: () => void;
}

/** البطاقة الكبيرة لأهم نشاط قريب في الصفحة الرئيسية. */
export function EventHero({ activity, onViewDetails, onRegister }: EventHeroProps) {
  const meta = CATEGORY_META[activity.category];

  return (
    <LinearGradient
      colors={[colors.primaryLight, colors.primary, colors.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <PatternOverlay opacity={0.08} />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{relativeDayLabel(activity.date)}</Text>
      </View>

      <View style={styles.categoryRow}>
        <Ionicons name={meta.icon} size={16} color={colors.gold} />
        <Text style={styles.categoryLabel}>{meta.label}</Text>
      </View>

      <Text style={styles.title}>{activity.title}</Text>

      <View style={styles.infoRow}>
        <Ionicons name="calendar-outline" size={15} color="rgba(255,255,255,0.75)" />
        <Text style={styles.infoText}>{formatArabicTime(activity.startTime)}</Text>
        <Text style={styles.infoDot}>•</Text>
        <Ionicons name="location-outline" size={15} color="rgba(255,255,255,0.75)" />
        <Text style={styles.infoText}>{activity.location}</Text>
      </View>

      <View style={styles.actions}>
        <SecondaryButton
          label="عرض التفاصيل"
          onPress={onViewDetails}
          style={styles.detailsButton}
          textColor={colors.textOnPrimary}
        />
        <PrimaryButton label="التسجيل" onPress={onRegister} style={styles.registerButton} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    overflow: "hidden",
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(199,162,82,0.18)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  badgeText: { fontFamily: "Tajawal_500Medium", fontSize: 12, color: colors.gold },
  categoryRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.xs },
  categoryLabel: { fontFamily: "Tajawal_400Regular", fontSize: 13, color: "rgba(255,255,255,0.8)" },
  title: { ...typography.h1, color: colors.textOnPrimary, marginBottom: spacing.md },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.lg, flexWrap: "wrap" },
  infoText: { fontFamily: "Tajawal_400Regular", fontSize: 13, color: "rgba(255,255,255,0.85)" },
  infoDot: { color: "rgba(255,255,255,0.5)" },
  actions: { flexDirection: "row", gap: spacing.sm },
  detailsButton: { flex: 1, borderColor: "rgba(255,255,255,0.5)", backgroundColor: "transparent" },
  registerButton: { flex: 1, backgroundColor: colors.accent },
});
