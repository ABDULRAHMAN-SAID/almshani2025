import type { Activity, Announcement, AwarenessArticle } from "@/types/models";
import { USE_MOCK_DATA } from "./config";
import { MOCK_ACTIVITIES, MOCK_ANNOUNCEMENTS, MOCK_AWARENESS } from "./mockData";
import { supabase } from "./supabase";

const sortByDateAsc = (a: Activity, b: Activity) => a.date.localeCompare(b.date);

/** كل الأنشطة (للتقويم الشهري والسنوي وشاشات الأقسام). */
export async function fetchAllActivities(): Promise<Activity[]> {
  if (USE_MOCK_DATA) {
    return [...MOCK_ACTIVITIES].sort(sortByDateAsc);
  }
  const { data } = await supabase.from("activities").select("*").order("date", { ascending: true });
  return (data as Activity[]) ?? [];
}

/** أقرب نشاط قادم (أو نشاط اليوم) لعرضه في Hero Card بالصفحة الرئيسية. */
export async function fetchHeroActivity(): Promise<Activity | null> {
  if (USE_MOCK_DATA) {
    const upcoming = MOCK_ACTIVITIES.filter((a) => a.registrationStatus !== "ended").sort(sortByDateAsc);
    return upcoming[0] ?? null;
  }
  const { data } = await supabase
    .from("activities")
    .select("*")
    .gte("date", new Date().toISOString().slice(0, 10))
    .order("date", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as Activity) ?? null;
}

/** الأنشطة القادمة (بعد استثناء نشاط Hero) لقسم "الأنشطة القادمة". */
export async function fetchUpcomingActivities(excludeId?: string): Promise<Activity[]> {
  if (USE_MOCK_DATA) {
    return MOCK_ACTIVITIES.filter((a) => a.id !== excludeId && a.registrationStatus !== "ended").sort(
      sortByDateAsc
    );
  }
  const { data } = await supabase
    .from("activities")
    .select("*")
    .neq("id", excludeId ?? "")
    .order("date", { ascending: true });
  return (data as Activity[]) ?? [];
}

export async function fetchLatestAnnouncements(limit = 3): Promise<Announcement[]> {
  if (USE_MOCK_DATA) {
    return [...MOCK_ANNOUNCEMENTS]
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, limit);
  }
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data as Announcement[]) ?? [];
}

export async function fetchTodayAwareness(): Promise<AwarenessArticle | null> {
  if (USE_MOCK_DATA) {
    return [...MOCK_AWARENESS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))[0] ?? null;
  }
  const { data } = await supabase
    .from("awareness_articles")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as AwarenessArticle) ?? null;
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
