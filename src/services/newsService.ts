import type { NewsItem, NewsScope } from "@/types/models";
import { LIST_LIMIT, USE_MOCK_DATA } from "./config";
import { MOCK_NEWS } from "./mockData";
import { toNewsItem } from "./rowMappers";
import { supabase } from "./supabase";

/**
 * أخبار القاعدة: عالمية وعُمانية.
 *
 * المصدر قاعدةُ المشروع نفسها لا خلاصةً خارجية. والسبب ليس تقنيًّا: الخبر في
 * تطبيق رسمي لقاعدة جوية مسؤوليةٌ تحريرية، ومن يفتحه يقرأه على أنه منشور
 * منها. فالنشر بيد الإدارة، والمصدر مذكور في كل خبر.
 *
 * والخطأ يُرفع ولا يُبتلع، كبقيّة القراءات: شبكةٌ منقطعة يجب أن تظهر انقطاعًا
 * لا «لا توجد أخبار».
 */
export async function fetchNews(scope?: NewsScope): Promise<NewsItem[]> {
  if (USE_MOCK_DATA) {
    return MOCK_NEWS.filter((item) => !scope || item.scope === scope).sort((a, b) =>
      b.publishedAt.localeCompare(a.publishedAt)
    );
  }

  let query = supabase.from("news").select("*");
  if (scope) query = query.eq("scope", scope);
  const { data, error } = await query.order("published_at", { ascending: false }).limit(LIST_LIMIT);
  if (error) throw error;
  return (data ?? []).map(toNewsItem);
}

/** أحدث خبر من كل نطاق — لبطاقة الصفحة الرئيسية. */
export async function fetchLatestNews(perScope = 3): Promise<NewsItem[]> {
  const all = await fetchNews();
  const world = all.filter((item) => item.scope === "world").slice(0, perScope);
  const oman = all.filter((item) => item.scope === "oman").slice(0, perScope);
  return [...oman, ...world].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function fetchNewsItem(id: string): Promise<NewsItem | null> {
  if (USE_MOCK_DATA) return MOCK_NEWS.find((item) => item.id === id) ?? null;
  const { data, error } = await supabase.from("news").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toNewsItem(data) : null;
}

/* ------------------------------ إدارة ------------------------------ */

export interface NewsDraft {
  title: string;
  summary: string;
  body: string;
  scope: NewsScope;
  source: string;
  url?: string;
  image?: string;
}

export async function publishNews(draft: NewsDraft): Promise<void> {
  if (USE_MOCK_DATA) return;
  const { error } = await supabase.from("news").insert({
    title: draft.title.trim(),
    summary: draft.summary.trim(),
    body: draft.body.trim(),
    scope: draft.scope,
    source: draft.source.trim(),
    url: draft.url?.trim() || null,
    image: draft.image?.trim() || null,
  });
  if (error) throw error;
}

export async function deleteNews(id: string): Promise<void> {
  if (USE_MOCK_DATA) return;
  const { error } = await supabase.from("news").delete().eq("id", id);
  if (error) throw error;
}
