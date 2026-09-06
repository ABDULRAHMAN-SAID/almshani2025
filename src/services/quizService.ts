import type { QuizQuestion, WeeklyQuiz } from "@/types/models";
import { USE_MOCK_DATA } from "./config";
import { MOCK_WEEKLY_QUIZ } from "./mockData";
import { recordMockPoints } from "./pointsService";
import { supabase } from "./supabase";

export type PublicQuizQuestion = Omit<QuizQuestion, "correctOptionIndex">;
export type PublicWeeklyQuiz = Omit<WeeklyQuiz, "questions"> & { questions: PublicQuizQuestion[] };

const answeredMock = new Map<string, { isCorrect: boolean; pointsEarned: number }>();

function stripAnswer(q: QuizQuestion): PublicQuizQuestion {
  const { correctOptionIndex: _correctOptionIndex, ...rest } = q;
  return rest;
}

/**
 * الأسئلة تصل للعميل بدون كشف الإجابة الصحيحة — تمامًا مثل عرض
 * quiz_questions_public في Supabase. التحقق يتم فقط داخل submitQuizAnswer.
 */
export async function fetchCurrentWeeklyQuiz(): Promise<PublicWeeklyQuiz | null> {
  if (USE_MOCK_DATA) {
    return { ...MOCK_WEEKLY_QUIZ, questions: MOCK_WEEKLY_QUIZ.questions.map(stripAnswer) };
  }
  const { data: quiz } = await supabase
    .from("weekly_quizzes")
    .select("*")
    .eq("status", "open")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!quiz) return null;
  const { data: questions } = await supabase
    .from("quiz_questions_public")
    .select("*")
    .eq("quiz_id", quiz.id);
  return { ...quiz, questions: (questions as PublicQuizQuestion[]) ?? [] };
}

export function getAnsweredState(questionId: string) {
  return answeredMock.get(questionId) ?? null;
}

/** يحاكي دالة submit_quiz_answer الموثوقة على الخادم: التحقق ومنح النقاط بمعزل عن العميل. */
export async function submitQuizAnswer(
  questionId: string,
  selectedOptionIndex: number
): Promise<{ isCorrect: boolean; pointsEarned: number }> {
  if (USE_MOCK_DATA) {
    if (answeredMock.has(questionId)) {
      return answeredMock.get(questionId)!;
    }
    const question = MOCK_WEEKLY_QUIZ.questions.find((q) => q.id === questionId);
    const isCorrect = question?.correctOptionIndex === selectedOptionIndex;
    const pointsEarned = isCorrect ? 10 : 0;
    const result = { isCorrect, pointsEarned };
    answeredMock.set(questionId, result);
    if (isCorrect) {
      recordMockPoints({ reason: "quiz_correct", points: pointsEarned });
    }
    return result;
  }
  const { data, error } = await supabase
    .rpc("submit_quiz_answer", { p_question_id: questionId, p_selected_option_index: selectedOptionIndex })
    .single();
  if (error) throw error;
  const row = data as { is_correct: boolean; points_earned: number };
  return { isCorrect: row.is_correct, pointsEarned: row.points_earned };
}
