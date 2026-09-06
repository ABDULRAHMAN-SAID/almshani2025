import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "@/constants";
import { POINTS_REASON_LABEL, type PointsTransaction } from "@/types/models";
import { formatArabicDate } from "@/utils/date";

const REASON_ICON: Record<PointsTransaction["reason"], keyof typeof Ionicons.glyphMap> = {
  lecture_attendance: "mic-outline",
  activity_participation: "football-outline",
  quiz_correct: "help-circle-outline",
};

export function PointsHistoryRow({ transaction }: { transaction: PointsTransaction }) {
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Ionicons name={REASON_ICON[transaction.reason]} size={18} color={colors.primary} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{POINTS_REASON_LABEL[transaction.reason]}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {transaction.activityTitle ?? formatArabicDate(transaction.createdAt)}
        </Text>
      </View>
      <Text style={styles.points}>+{transaction.points}</Text>
    </View>
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
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1, gap: 2 },
  title: { ...typography.body, fontFamily: "Tajawal_500Medium" },
  subtitle: { ...typography.caption },
  points: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: colors.success },
});
