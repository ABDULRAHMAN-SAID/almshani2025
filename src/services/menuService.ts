import type { ClubKey, ClubMenu, ClubProfile } from "@/types/models";
import { USE_MOCK_DATA } from "./config";
import { MOCK_CLUBS, MOCK_CLUB_MENUS } from "./mockData";
import { toClubMenu, toClubProfile } from "./rowMappers";
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
  images: string[];
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
      // الفارغ لا يُحفظ: من رفع صورة واحدة لا يُعرض على الناس إطاران فارغان.
      images: draft.images.map((url) => url.trim()).filter((url) => url.length > 0),
    },
    { onConflict: "club,week_start" }
  );
  if (error) throw error;
}

/* ------------------------------ النادي نفسه ------------------------------ */

/**
 * ملفّ النادي: اسمه.
 *
 * وكان مكتوبًا في الشفرة، فلم يكن لمن يعرف النادي سبيلٌ إلى تصحيحه.
 */
export async function fetchClub(key: ClubKey): Promise<ClubProfile | null> {
  if (USE_MOCK_DATA) return MOCK_CLUBS.find((club) => club.key === key) ?? null;
  const { data, error } = await supabase
    .from("clubs")
    .select("*")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return data ? toClubProfile(data) : null;
}

export async function updateClub(key: ClubKey, patch: Partial<ClubProfile>): Promise<void> {
  if (USE_MOCK_DATA) return;
  const { error } = await supabase.from("clubs").upsert(
    {
      key,
      title: patch.title?.trim() ?? "",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (error) throw error;
}
