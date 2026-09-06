import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "@/constants";
import type { AwarenessArticle } from "@/types/models";

interface AwarenessCardProps {
  article: AwarenessArticle;
  onPress?: () => void;
}

/** بطاقة "توعية اليوم" — قصيرة ومباشرة، بدون نصوص طويلة. */
export function AwarenessCard({ article, onPress }: AwarenessCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="bulb-outline" size={16} color={colors.gold} />
        <Text style={styles.eyebrow}>توعية اليوم</Text>
      </View>
      <Text style={styles.title}>{article.title}</Text>
      <Text style={styles.summary} numberOfLines={2}>
        {article.summary}
      </Text>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.readMore}>
        <Text style={styles.readMoreLabel}>اقرأ المزيد</Text>
        <Ionicons name="chevron-back" size={14} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderRightWidth: 3,
    borderRightColor: colors.gold,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.xs },
  eyebrow: { fontFamily: "Tajawal_500Medium", fontSize: 12, color: colors.gold },
  title: { ...typography.h3, marginBottom: spacing.xs },
  summary: { ...typography.bodyMuted, marginBottom: spacing.sm },
  readMore: { flexDirection: "row", alignItems: "center", gap: 2, alignSelf: "flex-start" },
  readMoreLabel: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: colors.primary },
});
