/**
 * ترجمة أخطاء الشبكة والخادم إلى رسائل عربية مفهومة.
 *
 * الهدف أن يعرف المستخدم ماذا حدث وماذا يفعل، لا أن يرى نص الخطأ الإنجليزي.
 * كل نداء خدمة في الشاشات يمرّ خطأه من هنا.
 */

/** أخطاء الشبكة: لا اتصال، انقطاع، أو مهلة. */
const NETWORK_HINTS = ["network request failed", "failed to fetch", "networkerror", "timeout", "econnrefused", "enotfound"];

/** رموز Postgres/Supabase التي لها معنى واضح للمستخدم. */
const CODE_MESSAGES: Record<string, string> = {
  "23505": "هذا العنصر مسجَّل مسبقًا.",
  "23503": "لا يمكن إتمام العملية لارتباط هذا العنصر بعناصر أخرى.",
  "23514": "إحدى القيم خارج النطاق المسموح.",
  "42501": "ليست لديك صلاحية لهذه العملية.",
  "PGRST301": "انتهت صلاحية جلستك، سجّل الدخول من جديد.",
  "PGRST116": "لم يُعثر على العنصر المطلوب.",
  "22P02": "إحدى القيم بصيغة غير صحيحة.",
};

interface MaybeSupabaseError {
  message?: unknown;
  code?: unknown;
  status?: unknown;
  details?: unknown;
}

function readText(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  const candidate = error as MaybeSupabaseError | null;
  if (candidate && typeof candidate.message === "string") return candidate.message;
  return "";
}

/** هل سبب الخطأ انقطاع الشبكة؟ تستخدمه الشاشات لعرض حالة «لا يوجد اتصال». */
export function isNetworkError(error: unknown): boolean {
  const text = readText(error).toLowerCase();
  return NETWORK_HINTS.some((hint) => text.includes(hint));
}

/**
 * الرسالة التي تُعرض للمستخدم. `fallback` هو ما يُقال حين لا نعرف السبب،
 * ويجب أن يصف العملية التي فشلت لا الخطأ نفسه.
 */
export function toArabicMessage(error: unknown, fallback = "تعذّر إتمام العملية، حاول مرة أخرى"): string {
  if (isNetworkError(error)) {
    return "لا يوجد اتصال بالإنترنت. تحقّق من الشبكة وحاول مرة أخرى.";
  }

  const candidate = error as MaybeSupabaseError | null;
  const code = candidate && typeof candidate.code === "string" ? candidate.code : "";
  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];

  const status = candidate && typeof candidate.status === "number" ? candidate.status : 0;
  if (status === 401 || status === 403) return "ليست لديك صلاحية لهذه العملية.";
  if (status === 404) return "لم يُعثر على العنصر المطلوب.";
  if (status === 429) return "طلبات كثيرة خلال وقت قصير. انتظر قليلًا ثم أعد المحاولة.";
  if (status >= 500) return "الخادم لا يستجيب حاليًا. أعد المحاولة بعد قليل.";

  const text = readText(error);
  if (text.toLowerCase().includes("forbidden")) return "ليست لديك صلاحية لهذه العملية.";
  if (text.toLowerCase().includes("jwt")) return "انتهت صلاحية جلستك، سجّل الدخول من جديد.";

  return fallback;
}
