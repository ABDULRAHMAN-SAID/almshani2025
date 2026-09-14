import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DEFAULT_FEATURES,
  type AppFeatures,
  fetchFeatures,
  setFeature,
} from "@/services/settingsService";

const KEY = ["app-features"];

/**
 * مفاتيح التشغيل كما هي على الخادم.
 *
 * تُقرأ مرة وتُحفظ خمس دقائق: لا يتغيّر هذا كثيرًا، ولا يصحّ أن يُسأل عنه
 * الخادم في كل شاشة. وحتى تصل، نعرض كل شيء مفتوحًا — فالمنع الحقيقي في
 * السياسات لا في هذه القيمة.
 */
export function useFeatures(): AppFeatures {
  const query = useQuery({
    queryKey: KEY,
    queryFn: fetchFeatures,
    staleTime: 5 * 60_000,
  });
  return query.data ?? DEFAULT_FEATURES;
}

export function useSetFeature() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: keyof AppFeatures; value: boolean }) =>
      setFeature(key, value),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}
