import type { ClubKey, ClubMenu } from "@/types/models";
import { USE_MOCK_DATA } from "./config";
import { MOCK_CLUB_MENUS } from "./mockData";
import { toClubMenu } from "./rowMappers";
import { supabase } from "./supabase";

/**
 * قائمة طعام النادي — أسبوعًا أسبوعًا.
 *
 * والنادي مطعم قبل أن يكون قاعة: ما يُسأل عنه كل أسبوع هو طعام الأسبوع، لا
 * الفعاليات. فله هنا جدوله لا زاويةٌ في الإعلانات: الإعلان يُقرأ مرّة ويُنسى،
 * والقائمة تُراجَع كل يوم وتُستبدل كل أسبوع.
 */

/** بداية أسبوع التاريخ المعطى — والأسبوع يبدأ الأحد كما هو العمل في السلطنة. */
export function weekStartOf(date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** قائمة الأسبوع الجاري لنادٍ، أو أحدث قائمة منشورة إن لم تُنشر قائمة هذا الأسبوع. */
export async function fetchClubMenu(club: ClubKey): Promise<ClubMenu | null> {
  if (USE_MOCK_DATA) {
    return (
      [...MOCK_CLUB_MENUS]
        .filter((menu) => menu.club === club)
        .sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0] ?? null
    );
  }
  const { data, error } = await supabase
    .from("club_menus")
    .select("*")
    .eq("club", club)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toClubMenu(data) : null;
}

export interface ClubMenuDraft {
  club: ClubKey;
  weekStart: string;
  image?: string;
  note?: string;
  days: { day: string; meal: string }[];
}

/**
 * نشر قائمة الأسبوع — أو تصحيحها.
 *
 * ‏upsert لا insert: مفتاح (النادي، بداية الأسبوع) فريد، فإعادة النشر تصحيحٌ
 * يحلّ محلّ الأول. ولو أُدرجت صفوف متتالية لقرأ بعض الناس قائمةً أُبطلت.
 */
export async function publishClubMenu(draft: ClubMenuDraft): Promise<void> {
  if (USE_MOCK_DATA) return;
  const { error } = await supabase.from("club_menus").upsert(
    {
      club: draft.club,
      week_start: draft.weekStart,
      image: draft.image?.trim() || null,
      note: draft.note?.trim() ?? "",
      // الأيام الفارغة لا تُحفظ: قائمةٌ نصفها فراغ تُقرأ على أن المطعم مغلق.
      days: draft.days.filter((entry) => entry.meal.trim().length > 0),
    },
    { onConflict: "club,week_start" }
  );
  if (error) throw error;
}
