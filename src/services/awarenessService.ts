import type { AwarenessArticle } from "@/types/models";
import { USE_MOCK_DATA } from "./config";
import { MOCK_AWARENESS_LIBRARY } from "./mockData";
import { toAwarenessArticle } from "./rowMappers";
import { supabase } from "./supabase";

// الخطأ يُرفع ولا يُبتلع: القراءة التي تُرجع فراغًا عند انقطاع الشبكة
// تجعل الشاشة تقول «لا توجد بيانات» والخادمُ غير متاح أصلًا — فلا يرى
// المستخدم سببًا ولا زرّ إعادة محاولة. ومع رفعه يتكفّل QueryState بهما.
export async function fetchAwarenessLibrary(): Promise<AwarenessArticle[]> {
  if (USE_MOCK_DATA) {
    return [...MOCK_AWARENESS_LIBRARY].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }
  const { data, error } = await supabase
    .from("awareness_articles")
    .select("*")
    .order("published_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toAwarenessArticle);
}

export async function fetchAwarenessArticle(id: string): Promise<AwarenessArticle | null> {
  if (USE_MOCK_DATA) {
    return MOCK_AWARENESS_LIBRARY.find((article) => article.id === id) ?? null;
  }
  const { data, error } = await supabase.from("awareness_articles").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toAwarenessArticle(data) : null;
}
