import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "@/constants";
import type { PublicQuizQuestion } from "@/services/quizService";

interface QuizQuestionCardProps {
  question: PublicQuizQuestion;
  index: number;
  total: number;
  initialResult?: { isCorrect: boolean; pointsEarned: number } | null;
  onSubmit: (selectedIndex: number) => Promise<{ isCorrect: boolean; pointsEarned: number }>;
}

export function QuizQuestionCard({ question, index, total, initialResult, onSubmit }: QuizQuestionCardProps) {
  const [selected, setSelected] = useState<number | null>(initialResult ? -1 : null);
  const [result, setResult] = useState<{ isCorrect: boolean; pointsEarned: number } | null>(initialResult ?? null);
  const [submitting, setSubmitting] = useState(false);
  const answered = Boolean(result);

  const handleSelect = async (optionIndex: number) => {
    if (answered || submitting) return;
    setSelected(optionIndex);
    setSubmitting(true);
    try {
      const res = await onSubmit(optionIndex);
      setResult(res);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <Text style={styles.category}>{question.category}</Text>
        <Text style={styles.counter}>
          {index + 1} / {total}
        </Text>
      </View>
      <Text style={styles.question}>{question.text}</Text>

      <View style={{ gap: spacing.sm }}>
        {question.options.map((option, optionIndex) => {
          const isSelected = selected === optionIndex;
          const showCorrect = answered && result?.isCorrect && isSelected;
          const showWrong = answered && !result?.isCorrect && isSelected;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              disabled={answered || submitting}
              onPress={() => handleSelect(optionIndex)}
              style={[
                styles.option,
                isSelected && !answered && styles.optionSelected,
                showCorrect && styles.optionCorrect,
                showWrong && styles.optionWrong,
              ]}
            >
              <Text style={styles.optionText}>{option}</Text>
              {submitting && isSelected ? <ActivityIndicator size="small" color={colors.primary} /> : null}
              {showCorrect ? <Ionicons name="checkmark-circle" size={18} color={colors.success} /> : null}
              {showWrong ? <Ionicons name="close-circle" size={18} color={colors.danger} /> : null}
            </Pressable>
          );
        })}
      </View>

      {answered ? (
        <View style={[styles.feedback, result?.isCorrect ? styles.feedbackGood : styles.feedbackBad]}>
          <Ionicons
            name={result?.isCorrect ? "checkmark-circle" : "information-circle"}
            size={16}
            color={result?.isCorrect ? colors.success : colors.danger}
          />
          <Text style={[styles.feedbackText, { color: result?.isCorrect ? colors.success : colors.danger }]}>
            {result?.isCorrect ? `إجابة صحيحة! +${result.pointsEarned} نقاط` : "إجابة غير صحيحة، حظًا أوفر في السؤال القادم"}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  category: { ...typography.caption, fontFamily: "Tajawal_500Medium", color: colors.primary },
  counter: { ...typography.caption },
  question: { ...typography.h3, fontSize: 16 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  optionSelected: { borderColor: colors.primary },
  optionCorrect: { borderColor: colors.success, backgroundColor: "rgba(30,142,90,0.08)" },
  optionWrong: { borderColor: colors.danger, backgroundColor: "rgba(179,38,30,0.06)" },
  optionText: { ...typography.body },
  feedback: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 2 },
  feedbackGood: {},
  feedbackBad: {},
  feedbackText: { fontFamily: "Tajawal_500Medium", fontSize: 13 },
});
