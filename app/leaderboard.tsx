import { ScrollView, StyleSheet, Text, View } from "react-native";
import { LeaderboardRow } from "@/components/LeaderboardRow";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, spacing, typography } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { useLeaderboard } from "@/hooks/usePoints";

export default function LeaderboardScreen() {
  const { data } = useLeaderboard();
  const { user } = useAuth();

  return (
    <View style={styles.screen}>
      <ScreenHeader title="قائمة المتصدرين" />
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
  hint: { ...typography.bodyMuted, textAlign: "center", marginTop: spacing.sm },
  content: { padding: spacing.lg },
});
