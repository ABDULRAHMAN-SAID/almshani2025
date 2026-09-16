import type { FlightSchedule } from "@/types/models";
import { USE_MOCK_DATA } from "./config";
import { MOCK_FLIGHT_SCHEDULE } from "./mockData";
import { toFlightSchedule } from "./rowMappers";
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
  if (error) throw error;
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
