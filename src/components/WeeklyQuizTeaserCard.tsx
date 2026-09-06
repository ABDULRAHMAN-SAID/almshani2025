import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "@/constants";
import type { PublicWeeklyQuiz } from "@/services/quizService";

interface WeeklyQuizTeaserCardProps {
  quiz: PublicWeeklyQuiz;
  answeredCount: number;
  onPress?: () => void;
}

/** بطاقة تعريفية بالمسابقة الثقافية الأسبوعية في الصفحة الرئيسية. */
export function WeeklyQuizTeaserCard({ quiz, answeredCount, onPress }: WeeklyQuizTeaserCardProps) {
  const remaining = quiz.questions.length - answeredCount;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="help-circle" size={24} color={colors.gold} />
      </View>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>{quiz.weekLabel}</Text>
        <Text style={styles.title}>الأسئلة الثقافية الأسبوعية</Text>
        <Text style={styles.subtitle}>
          {remaining > 0 ? `${remaining} أسئلة بانتظارك — 10 نقاط لكل إجابة صحيحة` : "أجبت عن كل أسئلة هذا الأسبوع"}
        </Text>
      </View>
      <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  pressed: { opacity: 0.9 },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: "rgba(199,162,82,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1, gap: 2 },
  eyebrow: { ...typography.caption, color: "#8a6d2c" },
  title: { ...typography.h3 },
  subtitle: { ...typography.bodyMuted, fontSize: 12.5 },
});
