import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
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
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export const isSupabaseConfigured = !USE_MOCK_DATA && Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
