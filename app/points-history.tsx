import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState } from "@/components/EmptyState";
import { PointsHistoryRow } from "@/components/PointsHistoryRow";
import { colors, radius, spacing, typography } from "@/constants";
import { usePointsBalance, usePointsHistory } from "@/hooks/usePoints";

export default function PointsHistoryScreen() {
  const balance = usePointsBalance();
  const history = usePointsHistory();

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>سجل النقاط</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.balanceCard}>
        <Ionicons name="star" size={22} color={colors.gold} />
        <Text style={styles.balanceValue}>{balance.data ?? 0}</Text>
        <Text style={styles.balanceLabel}>مجموع نقاطك الحالي</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {history.data && history.data.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            {history.data.map((tx) => (
              <PointsHistoryRow key={tx.id} transaction={tx} />
            ))}
          </View>
        ) : (
          <EmptyState icon="star-outline" title="لا توجد نقاط بعد" subtitle="احضر محاضرة أو أجب عن السؤال الثقافي الأسبوعي لتبدأ بجمع النقاط" />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    paddingBottom: 0,
  },
  headerTitle: { ...typography.h3 },
  balanceCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.xl,
    gap: 4,
  },
  balanceValue: { fontFamily: "Tajawal_700Bold", fontSize: 30, color: colors.textPrimary },
  balanceLabel: { ...typography.bodyMuted },
  content: { padding: spacing.lg, paddingTop: spacing.lg },
});
