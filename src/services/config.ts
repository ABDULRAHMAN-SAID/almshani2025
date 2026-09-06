/**
 * مفتاح التبديل بين البيانات التجريبية و Supabase الحقيقي.
 * لا تغيّر أي شاشة عند التبديل — فقط طبقة services.
 */
export const USE_MOCK_DATA = process.env.EXPO_PUBLIC_USE_MOCK_DATA !== "false";

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
