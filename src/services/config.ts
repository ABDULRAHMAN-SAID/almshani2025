/**
 * مفتاح التبديل بين البيانات التجريبية و Supabase الحقيقي.
 * لا تغيّر أي شاشة عند التبديل — فقط طبقة services.
 */
export const USE_MOCK_DATA = process.env.EXPO_PUBLIC_USE_MOCK_DATA !== "false";

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * قناة رمز التأكيد عند إنشاء حساب جديد.
 *
 * "email" — يصل الرمز إلى البريد. مجاني ويعمل فور ربط الخادم.
 * "sms"   — يصل الرمز رسالةً إلى الهاتف. يتطلّب مزوّد رسائل مدفوعًا مضبوطًا
 *           في Supabase؛ وبدونه لا تصل رسالة واحدة ويقف كل تسجيل جديد.
 * "off"   — بلا تأكيد: يُنشأ الحساب ويدخل صاحبه مباشرة.
 */
export type VerifyChannel = "email" | "sms" | "off";

const channel = process.env.EXPO_PUBLIC_VERIFY_CHANNEL;
export const VERIFY_CHANNEL: VerifyChannel =
  channel === "sms" || channel === "off" ? channel : "email";
