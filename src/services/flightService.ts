import type { FlightSchedule } from "@/types/models";
import { FLIGHTS } from "@/constants/flights";
import type { Flight, FlightStop } from "@/constants/flights";
import { USE_MOCK_DATA } from "./config";
import { MOCK_FLIGHT_SCHEDULE } from "./mockData";
import { toFlightRoute, toFlightSchedule } from "./rowMappers";
import { supabase } from "./supabase";

/**
 * جدول رحلات الطائرة — صفٌّ واحد لا أكثر.
 *
 * والجدول المعلّق واحد في القاعدة: يصدر ورقةً «سارية حتى إشعار آخر»، فإذا
 * صدر غيره بطل الأول. ولو حُفظ كل جدول صفًّا جديدًا لقرأ بعض الناس جدولًا
 * أُبطل — والخطأ هنا رجلٌ يقف في المطار لرحلةٍ لا تُقلع. فالمفتاح ثابت،
 * والنشر يحلّ محلّ المنشور.
 */
export async function fetchFlightSchedule(): Promise<FlightSchedule | null> {
  if (USE_MOCK_DATA) return MOCK_FLIGHT_SCHEDULE;
  const { data, error } = await supabase
    .from("flight_schedule")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  // والورقة المصوّرة زيادةٌ على المكتوب: غيابها لا يُسقط الشاشة.
  if (error) return null;
  if (!data) return null;
  const schedule = toFlightSchedule(data);
  return schedule.images.length > 0 || schedule.title ? schedule : null;
}

export async function publishFlightSchedule(draft: {
  title: string;
  images: string[];
}): Promise<void> {
  if (USE_MOCK_DATA) return;
  const { error } = await supabase.from("flight_schedule").upsert(
    {
      id: 1,
      title: draft.title.trim(),
      images: draft.images.map((url) => url.trim()).filter((url) => url.length > 0),
      published_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (error) throw error;
}

/** رفع الجدول كلّه — لمن نشر ورقة خطأً، أو انتهى العمل بها ولم يصدر بديل. */
export async function deleteFlightSchedule(): Promise<void> {
  if (USE_MOCK_DATA) return;
  const { error } = await supabase.from("flight_schedule").delete().eq("id", 1);
  if (error) throw error;
}

/* ----------------------------- رحلات تُحرَّر ----------------------------- */

/**
 * الرحلات من الخادم.
 *
 * وكانت مكتوبة في شفرة التطبيق: من يعرف الجدول ويرى فيه رقمًا خطأً لا يملك
 * تصحيحه، ينتظر تحديثًا أكتبه أنا. فصارت صفوفًا تُحرَّر وتُحذف وتُضاف من
 * لوحة الإدارة.
 *
 * وحين لا يجيب الخادم — أو لم يُنفَّذ عليه التحديث بعد — يُقرأ الجدول
 * المكتوب في التطبيق. فالورقة معروفة، ومن يفتح الشاشة يريد موعد رحلته لا
 * رسالة عطل.
 */
export async function fetchFlightRoutes(): Promise<Flight[]> {
  if (USE_MOCK_DATA) return FLIGHTS;
  const { data, error } = await supabase.from("flight_routes").select("*");
  // الخطأ لا يُرفع هنا وحده من بين كل استعلامات التطبيق: الجدول ثابتٌ معروف
  // ومكتوبٌ في التطبيق، فخادمٌ لم يُنفَّذ عليه التحديث بعد — أو شبكةٌ مقطوعة —
  // يُجاب عنه بالورقة التي في اليد، لا بشاشة عطل. وقد وقع هذا بعينه: أضفتُ
  // الجدول إلى الخادم فاختفت الرحلات عند من لم ينفّذ التحديث، وهي عنده أصلًا.
  if (error) return FLIGHTS;
  const rows = (data ?? []).map(toFlightRoute);
  return rows.length > 0 ? rows : FLIGHTS;
}

export interface FlightRouteDraft {
  id?: string;
  station: string;
  day: string;
  aircraft: string;
  stops: FlightStop[];
  note?: string;
}

export async function saveFlightRoute(draft: FlightRouteDraft): Promise<void> {
  if (USE_MOCK_DATA) return;
  const row = {
    station: draft.station.trim(),
    day: draft.day.trim(),
    aircraft: draft.aircraft.trim(),
    // محطّة بلا مكان لا تُحفظ: خانةٌ فارغة في المسار تُقرأ رحلةً ناقصة.
    stops: draft.stops.filter((stop) => stop.place.trim().length > 0),
    note: draft.note?.trim() ?? "",
  };
  const query = draft.id
    ? supabase.from("flight_routes").update(row).eq("id", draft.id)
    : supabase.from("flight_routes").insert(row);
  const { error } = await query;
  if (error) throw error;
}

export async function deleteFlightRoute(id: string): Promise<void> {
  if (USE_MOCK_DATA) return;
  const { error } = await supabase.from("flight_routes").delete().eq("id", id);
  if (error) throw error;
}
