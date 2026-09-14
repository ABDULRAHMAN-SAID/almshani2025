import { useQuery } from "@tanstack/react-query";
import { fetchCurrentWeeklyQuiz } from "@/services/quizService";

export function useWeeklyQuiz() {
  return useQuery({ queryKey: ["weekly-quiz"], queryFn: fetchCurrentWeeklyQuiz });
}
