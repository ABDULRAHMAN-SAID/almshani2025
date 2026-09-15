import "react-native-url-polyfill/auto";
import { AppState } from "react-native";
import { createClient } from "@supabase/supabase-js";
import { safeStorage } from "@/store/persistStorage";
import { SUPABASE_ANON_KEY, SUPABASE_URL, USE_MOCK_DATA } from "./config";

/**
 * عميل Supabase. في وضع البيانات التجريبية (USE_MOCK_DATA) قد لا تتوفر
 * قيم حقيقية لـ URL/Key، لذا نستخدم قيمًا شكلية آمنة لتفادي كسر التطبيق،
 * لأن كل الاستدعاءات الفعلية تمر عبر services/mockData.ts أصلًا في هذا الوضع.
 */
export const supabase = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_ANON_KEY || "placeholder-anon-key",
  {
    auth: {
      storage: safeStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export const isSupabaseConfigured = !USE_MOCK_DATA && Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * تجديد رمز الجلسة يتبع دورة حياة التطبيق.
 *
 * ‏autoRefreshToken وحده لا يكفي على الهاتف: مؤقّتات JavaScript تُجمَّد حين
 * يذهب التطبيق إلى الخلفية، فلا يُجدَّد الرمز، وتنتهي صلاحيته بعد ساعة. ثم
 * يعود صاحبه فيجد نفسه خارج حسابه أو أمام أخطاءٍ لا سبب ظاهر لها — وهو أسوأ
 * ما يُصيب تطبيقًا يُفتح مرّات قصيرة في اليوم.
 *
 * فنوقف التجديد عند الخروج ونستأنفه عند العودة، كما تشترط وثائق Supabase
 * لـ React Native. والمستمع لا يُزال: العميل واحد يعيش عمر التطبيق.
 */
if (!USE_MOCK_DATA) {
  AppState.addEventListener("change", (status) => {
    if (status === "active") void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });
}
