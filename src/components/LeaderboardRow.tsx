import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "@/constants";
import type { LeaderboardEntry } from "@/types/models";

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isMe?: boolean;
}

export function LeaderboardRow({ entry, isMe }: LeaderboardRowProps) {
  const isTopThree = entry.rank <= 3;
  return (
    <View style={[styles.row, isMe && styles.rowMe]}>
      <View style={[styles.rankWrap, isTopThree && styles.rankTop]}>
        {isTopThree ? (
          <Ionicons name="trophy" size={16} color={colors.gold} />
        ) : (
          <Text style={styles.rankText}>{entry.rank}</Text>
        )}
      </View>
      <Text style={[styles.name, isMe && styles.nameMe]} numberOfLines={1}>
        {entry.name}
        {isMe ? " (أنت)" : ""}
      </Text>
      <View style={styles.pointsWrap}>
        <Ionicons name="star" size={13} color={colors.gold} />
        <Text style={styles.points}>{entry.totalPoints}</Text>
      </View>
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
  rowMe: { borderWidth: 1.5, borderColor: colors.primary },
  rankWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  rankTop: { backgroundColor: "rgba(199,162,82,0.16)" },
  rankText: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: colors.textMuted },
  name: { ...typography.body, flex: 1 },
  nameMe: { fontFamily: "Tajawal_700Bold" },
  pointsWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  points: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: colors.textPrimary },
});
