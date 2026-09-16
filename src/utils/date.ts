const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const ARABIC_WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

/**
 * يحوّل "YYYY-MM-DD" إلى تاريخ في المنطقة الزمنية للجهاز.
 *
 * ‏new Date("2026-09-11") تقرأها JavaScript بتوقيت غرينتش لا بتوقيت الجهاز،
 * فتصير في أي منطقة غربيّ غرينتش مساءَ اليوم السابق — ويظهر كل تاريخ في
 * التطبيق متأخّرًا يومًا كاملًا: التقويم، ويوم الأسبوع، و«اليوم/غدًا». عُمان
 * شرقيّ غرينتش فلا يظهر العطل فيها، ويظهر عند أول مسافر أو جهاز منطقته خاطئة.
 */
export function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

/** "15 أكتوبر" */
export function formatArabicDate(isoDate: string): string {
  const d = parseIsoDate(isoDate);
  return `${d.getDate()} ${ARABIC_MONTHS[d.getMonth()]}`;
}

/** "الخميس" */
export function formatArabicWeekday(isoDate: string): string {
  return ARABIC_WEEKDAYS[parseIsoDate(isoDate).getDay()];
}

export function arabicMonthName(monthIndex: number): string {
  return ARABIC_MONTHS[monthIndex];
}

/** "09:00 صباحًا" */
export function formatArabicTime(time: string): string {
  const [hourStr, minute] = time.split(":");
  const hour = Number(hourStr);
  const isAm = hour < 12;
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(hour12).padStart(2, "0")}:${minute} ${isAm ? "صباحًا" : "مساءً"}`;
}

/** "اليوم" / "غدًا" / "بعد 3 أيام" */
export function relativeDayLabel(isoDate: string): string {
  const target = parseIsoDate(isoDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (diffDays === 0) return "اليوم";
  if (diffDays === 1) return "غدًا";
  if (diffDays > 1) return `بعد ${diffDays} ${diffDays === 2 ? "يومين" : "أيام"}`;
  return formatArabicDate(isoDate);
}

/* ------------------------- ساعة عُمان وتاريخها ------------------------- */

/** فرق توقيت عُمان عن غرينتش بالدقائق. ثابت: لا توقيت صيفي في السلطنة. */
const OMAN_OFFSET_MINUTES = 4 * 60;

/**
 * لحظةُ عُمان الآن، محسوبةً من غرينتش لا من ساعة الجهاز.
 *
 * وهذا هو بيت القصيد: من ضبط هاتفه على منطقة أخرى — أو سافر — تظل الشاشة
 * تقول توقيت القاعدة، وهو التوقيت الذي تُعقد به المحاضرات ويُفتح به التسجيل.
 * ولو قرأنا ساعة الجهاز لأخبرناه بتوقيتٍ لا يعني هنا شيئًا.
 */
function omanNow(at: Date = new Date()): Date {
  return new Date(at.getTime() + (OMAN_OFFSET_MINUTES + at.getTimezoneOffset()) * 60_000);
}

/** "الثلاثاء ١٥ سبتمبر · ١١:٠٢ م" — سطر واحد صغير لأعلى الصفحة الرئيسية. */
export function omanDateTimeLabel(at: Date = new Date()): string {
  const d = omanNow(at);
  const hour = d.getHours();
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const minute = String(d.getMinutes()).padStart(2, "0");
  const period = hour < 12 ? "ص" : "م";
  return `${ARABIC_WEEKDAYS[d.getDay()]} ${d.getDate()} ${ARABIC_MONTHS[d.getMonth()]} · ${hour12}:${minute} ${period}`;
}

/** "١١:٠٢ م" بتوقيت عُمان — لوقت انتهاء رمز الحضور. */
export function omanClockLabel(at: Date = new Date()): string {
  const d = omanNow(at);
  const hour = d.getHours();
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const minute = String(d.getMinutes()).padStart(2, "0");
  return `${hour12}:${minute} ${hour < 12 ? "ص" : "م"}`;
}

/**
 * ما بقي من الوقت: "باقٍ ٥٨ دقيقة"، "باقٍ ساعتان و١٥ دقيقة"، أو "انتهى".
 *
 * ويُحسب بالفرق لا بالمنطقة الزمنية: الفرق بين لحظتين واحدٌ أينما كانت ساعة
 * الجهاز، فلا يُخطئ الحساب عند من ضبط هاتفه على غير توقيت السلطنة.
 */
export function remainingLabel(expiresAtIso: string, now: Date = new Date()): string {
  const left = new Date(expiresAtIso).getTime() - now.getTime();
  if (!Number.isFinite(left) || left <= 0) return "انتهى";
  const minutes = Math.ceil(left / 60_000);
  if (minutes < 60) return `باقٍ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hoursWord = hours === 1 ? "ساعة" : hours === 2 ? "ساعتان" : `${hours} ساعات`;
  return rest === 0 ? `باقٍ ${hoursWord}` : `باقٍ ${hoursWord} و${rest} دقيقة`;
}

/** هل انقضى وقت الانتهاء؟ و null (بلا انتهاء) لا ينقضي أبدًا. */
export function isExpired(expiresAtIso: string | null, now: Date = new Date()): boolean {
  if (!expiresAtIso) return false;
  return new Date(expiresAtIso).getTime() <= now.getTime();
}
