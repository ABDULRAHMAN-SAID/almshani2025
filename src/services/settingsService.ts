import { USE_MOCK_DATA } from "./config";
import { supabase } from "./supabase";

/**
 * مفاتيح تشغيل الميزات.
 *
 * مصدرها الخادم لا الجهاز. كانت محفوظة في ذاكرة جهاز الإداري، فيطفئ المجموعات
 * فتختفي الأزرار عنده وحده بينما يواصل بقية الناس النشر — ومفتاحُ إيقافٍ لا
 * يوقف شيئًا ليس مفتاح إيقاف. والخادم يفرضها في سياسات الكتابة نفسها، فلا يكفي
 * إخفاء الزرّ ولا يُجدي الالتفاف عليه.
 */

export interface AppFeatures {
  registrationEnabled: boolean;
  quizEnabled: boolean;
  pointsEnabled: boolean;
  discussionEnabled: boolean;
  messagesEnabled: boolean;
  /** الدردشة الخاصة والمجموعات. */
  chatEnabled: boolean;
  /** الطقس والموقع — بطاقة الرئيسية وشاشة الطقس. */
  weatherEnabled: boolean;
  /** فرق التاريخ الهجري عن أم القرى بالأيام — عُمان يومٌ قبله غالبًا. */
  hijriOffset: number;
}

export const DEFAULT_FEATURES: AppFeatures = {
  registrationEnabled: true,
  quizEnabled: true,
  pointsEnabled: true,
  discussionEnabled: true,
  messagesEnabled: true,
  chatEnabled: true,
  weatherEnabled: true,
  hijriOffset: -1,
};

/** نسخة الوضع التجريبي — في الذاكرة، ليعمل التبديل بلا خادم. */
let mockFeatures: AppFeatures = { ...DEFAULT_FEATURES };

export async function fetchFeatures(): Promise<AppFeatures> {
  if (USE_MOCK_DATA) return { ...mockFeatures };

  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  // تعذّرت القراءة: نُبقي كل شيء مفتوحًا بدل أن نُغلق التطبيق على الناس بسبب
  // انقطاع لحظي. الخادم هو من يمنع فعلًا، فالافتراض هنا للعرض لا للحماية.
  if (error || !data) return { ...DEFAULT_FEATURES };

  const row = data as Record<string, unknown>;
  return {
    registrationEnabled: row.registration_enabled !== false,
    quizEnabled: row.quiz_enabled !== false,
    pointsEnabled: row.points_enabled !== false,
    discussionEnabled: row.discussion_enabled !== false,
    messagesEnabled: row.messages_enabled !== false,
    chatEnabled: row.chat_enabled !== false,
    weatherEnabled: row.weather_enabled !== false,
    hijriOffset: clampOffset(row.hijri_offset),
  };
}

/** حدّان: يومان قبل ويومان بعد. وما خرج عنهما خطأٌ لا ضبط. */
function clampOffset(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_FEATURES.hijriOffset;
  return Math.max(-2, Math.min(2, Math.round(n)));
}

/** ضبط فرق التقويم — يظهر أثره عند كل من يفتح التطبيق، لا عند الإداري وحده. */
export async function setHijriOffset(value: number): Promise<void> {
  const offset = clampOffset(value);
  if (USE_MOCK_DATA) {
    mockFeatures = { ...mockFeatures, hijriOffset: offset };
    return;
  }
  const { error } = await supabase
    .from("app_settings")
    .update({ hijri_offset: offset, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw error;
}

const COLUMN: Record<string, string> = {
  registrationEnabled: "registration_enabled",
  quizEnabled: "quiz_enabled",
  pointsEnabled: "points_enabled",
  discussionEnabled: "discussion_enabled",
  messagesEnabled: "messages_enabled",
  chatEnabled: "chat_enabled",
  weatherEnabled: "weather_enabled",
};

export async function setFeature(key: keyof AppFeatures, value: boolean): Promise<void> {
  if (USE_MOCK_DATA) {
    mockFeatures = { ...mockFeatures, [key]: value };
    return;
  }
  const { error } = await supabase
    .from("app_settings")
    .update({ [COLUMN[key]]: value, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw error;
}
