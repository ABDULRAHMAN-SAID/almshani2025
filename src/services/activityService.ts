import type { Activity, Announcement, AwarenessArticle } from "@/types/models";
import { noticeAnnouncements } from "@/constants/flights";
import { isVisible } from "@/utils/visibility";
import { USE_MOCK_DATA } from "./config";
import { MOCK_ACTIVITIES, MOCK_ANNOUNCEMENTS, MOCK_AWARENESS } from "./mockData";
import { toActivity, toAnnouncement, toAwarenessArticle } from "./rowMappers";
import { supabase } from "./supabase";

// الخطأ يُرفع ولا يُبتلع: القراءة التي تُرجع فراغًا عند انقطاع الشبكة
// تجعل الشاشة تقول «لا توجد بيانات» والخادمُ غير متاح أصلًا — فلا يرى
// المستخدم سببًا ولا زرّ إعادة محاولة. ومع رفعه يتكفّل QueryState بهما.
const sortByDateAsc = (a: Activity, b: Activity) => a.date.localeCompare(b.date);

/** كل الأنشطة (للتقويم الشهري والسنوي وشاشات الأقسام). */
export async function fetchAllActivities(): Promise<Activity[]> {
  if (USE_MOCK_DATA) {
    return [...MOCK_ACTIVITIES].sort(sortByDateAsc);
  }
  const { data, error } = await supabase.from("activities").select("*").order("date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toActivity);
}

/** نشاط واحد بالمعرّف — لشاشة التفاصيل. */
export async function fetchActivityById(id: string): Promise<Activity | null> {
  if (USE_MOCK_DATA) {
    return MOCK_ACTIVITIES.find((activity) => activity.id === id) ?? null;
  }
  const { data, error } = await supabase.from("activities").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toActivity(data) : null;
}

/** أقرب نشاط قادم (أو نشاط اليوم) لعرضه في Hero Card بالصفحة الرئيسية. */
export async function fetchHeroActivity(): Promise<Activity | null> {
  if (USE_MOCK_DATA) {
    const upcoming = MOCK_ACTIVITIES.filter((a) => a.registrationStatus !== "ended").sort(sortByDateAsc);
    return upcoming[0] ?? null;
  }
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .gte("date", new Date().toISOString().slice(0, 10))
    .order("date", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toActivity(data) : null;
}

/** الأنشطة القادمة (بعد استثناء نشاط Hero) لقسم "الأنشطة القادمة". */
export async function fetchUpcomingActivities(excludeId?: string): Promise<Activity[]> {
  if (USE_MOCK_DATA) {
    return MOCK_ACTIVITIES.filter((a) => a.id !== excludeId && a.registrationStatus !== "ended").sort(
      sortByDateAsc
    );
  }
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .neq("id", excludeId ?? "")
    .order("date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toActivity);
}

export async function fetchLatestAnnouncements(limit = 3): Promise<Announcement[]> {
  // تنبيه رحلةٍ اليوم أولى بصدر الرئيسية من إعلانٍ نُشر الأسبوع الماضي.
  const notices = noticeAnnouncements().filter((item) => isVisible(item));
  const top = (list: Announcement[]) =>
    [...notices, ...list.filter((item) => isVisible(item))]
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, limit);

  if (USE_MOCK_DATA) return top(MOCK_ANNOUNCEMENTS);
  // نطلب أكثر من المطلوب ثم نُسقط ما لم يحن وقته أو انقضى: التصفية على
  // الخادم بشرطين اختياريين تُكتب طويلة، وهذه قائمةٌ من ثلاثة.
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(limit * 4);
  if (error) throw error;
  return top((data ?? []).map(toAnnouncement));
}

export async function fetchTodayAwareness(): Promise<AwarenessArticle | null> {
  if (USE_MOCK_DATA) {
    return [...MOCK_AWARENESS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))[0] ?? null;
  }
  const { data, error } = await supabase
    .from("awareness_articles")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toAwarenessArticle(data) : null;
}

/** أنشطة هذا الأسبوع (اليوم حتى 6 أيام قادمة) لبطاقة "هذا الأسبوع". */
export async function fetchThisWeekActivities(): Promise<Activity[]> {
  const all = USE_MOCK_DATA ? MOCK_ACTIVITIES : await fetchUpcomingActivities();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return all
    .filter((a) => {
      const d = new Date(a.date);
      return d >= start && d <= end;
    })
    .sort(sortByDateAsc);
}
