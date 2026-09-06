import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LeaderboardRow } from "@/components/LeaderboardRow";
import { colors, spacing, typography } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { useLeaderboard } from "@/hooks/usePoints";

export default function LeaderboardScreen() {
  const { data } = useLeaderboard();
  const { user } = useAuth();

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>قائمة المتصدرين</Text>
        <View style={{ width: 22 }} />
      </View>
      <Text style={styles.hint}>ترتيب المشاركين حسب مجموع النقاط هذا الفصل</Text>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing.sm }}>
          {(data ?? []).map((entry) => (
            <LeaderboardRow key={entry.userId} entry={entry} isMe={entry.userId === "me" || entry.name === user?.name} />
          ))}
        </View>
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
  hint: { ...typography.bodyMuted, textAlign: "center", marginTop: spacing.sm },
  content: { padding: spacing.lg },
});
