/**
 * ترجمة أخطاء الشبكة والخادم إلى رسائل عربية مفهومة.
 *
 * الهدف أن يعرف المستخدم ماذا حدث وماذا يفعل، لا أن يرى نص الخطأ الإنجليزي.
 * كل نداء خدمة في الشاشات يمرّ خطأه من هنا.
 */

/** نطاق الحروف العربية — به نعرف أن الرسالة كُتبت للمستخدم لا للمطوّر. */
const ARABIC = /[\u0600-\u06FF]/;

/** أخطاء الشبكة: لا اتصال، انقطاع، أو مهلة. */
const NETWORK_HINTS = ["network request failed", "failed to fetch", "networkerror", "timeout", "econnrefused", "enotfound"];

/**
 * ما يُقال حين يكون نقصُ الخادم هو السبب.
 *
 * ويُسمّى الحلّ لا العطل فقط: من يقرأ «تعذّر» يعيد المحاولة، ومن يقرأ هذا
 * يعرف أنّ عليه — أو على الإدارة — تنفيذ ملفّ التحديث مرّة واحدة.
 */
const SCHEMA_BEHIND =
  "الخادم لا يعرف هذه الميزة بعد. إن نُفِّذ ملفّ التحديث للتوّ فانتظر دقيقة وأعد المحاولة، وإلا فنفّذ supabase/update-now.sql في Supabase ← SQL Editor مرّة واحدة.";

/** رموز Postgres/Supabase التي لها معنى واضح للمستخدم. */
const CODE_MESSAGES: Record<string, string> = {
  "23505": "هذا العنصر مسجَّل مسبقًا.",
  // صنفٌ واحد من الأخطاء معناه واحد: الخادم أقدمُ من التطبيق — جدولٌ أو
  // عمودٌ أو دالةٌ يطلبها التطبيق ولم تُنشأ بعد. وكان يُقال لمن يراه «تعذّر
  // نشر القائمة» بلا سبب، فيعيد المحاولة عشرًا وهي لا تنجح مرّة: ليس العطل
  // فيه ولا في شبكته، ولا يُصلحه إلا تنفيذ ملفّ التحديث على الخادم.
  "42P01": SCHEMA_BEHIND,
  "42703": SCHEMA_BEHIND,
  "42883": SCHEMA_BEHIND,
  "42P10": SCHEMA_BEHIND,
  PGRST202: SCHEMA_BEHIND,
  PGRST204: SCHEMA_BEHIND,
  PGRST205: SCHEMA_BEHIND,
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
  // قيمةٌ لا يعرفها الخادم في نوعٍ مُعدَّد — كقسمٍ جديد أُضيف في التطبيق ولم
  // يُضف على الخادم. رمزها 22P02 نفسه الذي لسوء الصياغة، فيُفصل عنه بنصّه.
  if (/invalid input value for enum/i.test(readText(error))) return SCHEMA_BEHIND;
  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];

  const status = candidate && typeof candidate.status === "number" ? candidate.status : 0;
  // حدّان يخصّان الرفع: ملفّ أكبر من المسموح، ومساحة الخادم ممتلئة. وبلا
  // تمييزهما يُقال «تعذّر إتمام العملية» لمن يحتاج أن يعرف أنّ عليه اختيار
  // ملفّ أصغر، أو أنّ المشكلة ليست عنده أصلًا بل في مساحة الخادم.
  if (status === 413) return "الملفّ أكبر من الحدّ المسموح به. اختر ملفًّا أصغر.";
  if (status === 507) {
    return "مساحة التخزين على الخادم ممتلئة. على الإدارة حذف مرفقات قديمة أو توسيع الخطة.";
  }
  if (status === 401 || status === 403) return "ليست لديك صلاحية لهذه العملية.";
  if (status === 404) return "لم يُعثر على العنصر المطلوب.";
  if (status === 429) return "طلبات كثيرة خلال وقت قصير. انتظر قليلًا ثم أعد المحاولة.";
  if (status >= 500) return "الخادم لا يستجيب حاليًا. أعد المحاولة بعد قليل.";

  const text = readText(error);
  const lower = text.toLowerCase();
  if (/payload too large|exceeded the maximum/.test(lower)) {
    return "الملفّ أكبر من الحدّ المسموح به. اختر ملفًّا أصغر.";
  }
  if (/quota|storage limit|insufficient storage/.test(lower)) {
    return "مساحة التخزين على الخادم ممتلئة. على الإدارة حذف مرفقات قديمة أو توسيع الخطة.";
  }
  if (
    /could not find the (table|function|column)|does not exist|schema cache|no unique or exclusion constraint/i.test(
      lower
    )
  ) {
    return SCHEMA_BEHIND;
  }
  if (lower.includes("forbidden")) return "ليست لديك صلاحية لهذه العملية.";
  if (lower.includes("jwt")) return "انتهت صلاحية جلستك، سجّل الدخول من جديد.";

  // رسالة عربية تعني أن طبقة الخدمات صاغتها للمستخدم أصلًا، فهي أدقّ من أي
  // عبارة عامة. وبدون هذا السطر كانت كل رسائل المصادقة المكتوبة بعناية
  // تُرمى ويُعرض «تعذّر إتمام العملية» مكانها.
  if (ARABIC.test(text)) return text;

  // لم نعرف السبب. وهنا كان يُقال «تعذّر نشر القائمة» وحدها، فيقف صاحبها
  // أمام جملة تصف ما لم يقع ولا تقول لِمَ — فيعيد المحاولة، أو يظنّ العطل
  // في هاتفه، ولا سبيل له ولا لنا إلى معرفة ما قاله الخادم. فنضمّ كلامه
  // كما هو: قد لا يفهمه، لكنه يصوّره ويرسله، فيُعرف العطل في دقيقة بدل يوم.
  const detail = text.trim().replace(/\s+/g, " ").slice(0, 140);
  return detail ? `${fallback}\n(${detail})` : fallback;
}
