import type { NewsItem, NewsScope } from "@/types/models";
import { LIST_LIMIT, USE_MOCK_DATA } from "./config";
import { MOCK_NEWS } from "./mockData";
import { toNewsItem } from "./rowMappers";
import { supabase } from "./supabase";

/**
 * أخبار القاعدة: محلية ودولية.
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

/**
 * تعديل خبر منشور.
 *
 * ولم يكن موجودًا: نُشر خبر بلا صورة، فلم يكن أمام ناشره إلا حذفه وكتابته من
 * أوّله — وقد يكون طويلًا، وقد يكون فيه ما لا يُستعاد. والتعديل هو الحال
 * الغالب في النشر لا الاستثناء.
 *
 * ‏published_at لا يُمَسّ: تعديلُ صورةٍ أو تصحيحُ حرف لا يجعل الخبر جديدًا،
 * ولو رُفع تاريخه لقفز فوق ما نُشر بعده في كل قائمة.
 */
export async function updateNews(id: string, draft: NewsDraft): Promise<void> {
  if (USE_MOCK_DATA) return;
  const { error } = await supabase
    .from("news")
    .update({
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      body: draft.body.trim(),
      scope: draft.scope,
      source: draft.source.trim(),
      url: draft.url?.trim() || null,
      image: draft.image?.trim() || null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteNews(id: string): Promise<void> {
  if (USE_MOCK_DATA) return;
  const { error } = await supabase.from("news").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------------- نقطة لمن قرأ الخبر ---------------------- */

export interface NewsReadResult {
  /** هل مُنحت النقاط الآن؟ يكون false لمن قرأه من قبل — وليس ذلك خطأً. */
  awarded: boolean;
  pointsEarned: number;
}

/** أُعطي نقاطًا محليًّا في نسخة العرض، لتُجرَّب الشاشة بلا خادم. */
const MOCK_READ = new Set<string>();

/**
 * تسجيل أن القارئ أتمّ الخبر، ومنحه النقطة.
 *
 * الحساب كلّه على الخادم: لو كان الهاتف هو من يكتب النقطة لكتبها من شاء كما
 * شاء بلا أن يفتح خبرًا. والدالة تمنح مرّة واحدة لكل خبر — المفتاح الأوّلي في
 * جدول القراءات هو ما يمنع الثانية، لا فحصٌ في الشاشة يمكن تجاوزه.
 */
export async function markNewsRead(id: string): Promise<NewsReadResult> {
  if (USE_MOCK_DATA) {
    if (MOCK_READ.has(id)) return { awarded: false, pointsEarned: 0 };
    MOCK_READ.add(id);
    return { awarded: true, pointsEarned: 2 };
  }
  const { data, error } = await supabase.rpc("mark_news_read", { p_news_id: id });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    awarded: Boolean(row?.awarded),
    pointsEarned: Number(row?.points_earned ?? 0),
  };
}

/** هل قرأ صاحب الجلسة هذا الخبر من قبل؟ — لئلّا يُعرض عليه ما لن يناله. */
export async function hasReadNews(id: string): Promise<boolean> {
  if (USE_MOCK_DATA) return MOCK_READ.has(id);
  const { data, error } = await supabase
    .from("news_reads")
    .select("news_id")
    .eq("news_id", id)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
