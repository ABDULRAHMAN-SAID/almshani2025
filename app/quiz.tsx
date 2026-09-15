import { ScrollView, StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/components/EmptyState";
import { QuizQuestionCard } from "@/components/QuizQuestionCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, spacing, typography } from "@/constants";
import { useWeeklyQuiz } from "@/hooks/useWeeklyQuiz";
import { useRefreshPoints } from "@/hooks/usePoints";
import { getAnsweredState, submitQuizAnswer } from "@/services/quizService";
import { showToast } from "@/store/toastStore";

export default function WeeklyQuizScreen() {
  const { data: quiz, isLoading } = useWeeklyQuiz();
  const refreshPoints = useRefreshPoints();

  const handleSubmit = (questionId: string) => async (selectedIndex: number) => {
    const result = await submitQuizAnswer(questionId, selectedIndex);
    refreshPoints();
    if (result.isCorrect) showToast(`إجابة صحيحة! +${result.pointsEarned} نقاط`, "success");
    return result;
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="السؤال الثقافي الأسبوعي" />

      {isLoading ? null : quiz ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.weekLabel}>{quiz.weekLabel}</Text>
          <Text style={styles.hint}>10 نقاط لكل إجابة صحيحة — أجب عن الأسئلة الثلاثة قبل نهاية الأسبوع</Text>
          <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
            {quiz.questions.map((question, index) => (
              <QuizQuestionCard
                key={question.id}
                question={question}
                index={index}
                total={quiz.questions.length}
                initialResult={getAnsweredState(question.id)}
                onSubmit={handleSubmit(question.id)}
              />
            ))}
          </View>
        </ScrollView>
      ) : (
        <EmptyState icon="help-circle-outline" title="لا توجد أسئلة هذا الأسبوع حاليًا" subtitle="تابعنا الأسبوع القادم" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  weekLabel: { ...typography.caption, textAlign: "center", marginBottom: 2 },
  hint: { ...typography.bodyMuted, textAlign: "center" },
});
