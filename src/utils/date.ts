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

/** اسم يوم اليوم بتوقيت عُمان — يُفتح به جدول الرحلات على يومه. */
export function omanWeekdayName(at: Date = new Date()): string {
  return ARABIC_WEEKDAYS[omanNow(at).getDay()];
}

/* --------------------------- التاريخ الهجري --------------------------- */

const HIJRI_MONTHS = [
  "محرّم",
  "صفر",
  "ربيع الأول",
  "ربيع الآخر",
  "جمادى الأولى",
  "جمادى الآخرة",
  "رجب",
  "شعبان",
  "رمضان",
  "شوّال",
  "ذو القعدة",
  "ذو الحجّة",
];

interface HijriDate {
  day: number;
  month: number;
  year: number;
}

/** اليوم اليولياني — جسرٌ بين التقويمين، وبه تُحسب الهجري حسابًا. */
function julianDay(year: number, month: number, day: number): number {
  let y = year;
  let m = month;
  if (m < 3) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return (
    Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524
  );
}

/**
 * التقويم الهجري الحسابي (الجدولي).
 *
 * وهو احتياطٌ لا أصل: يقارب أم القرى ولا يطابقه دائمًا، فقد يختلف عنه يومًا.
 * ولا يُستعمل إلا حين لا يعرف الجهاز التقويم الهجري أصلًا — وحينها يومٌ
 * مقارب خيرٌ من فراغ.
 */
function tabularHijri(date: Date): HijriDate {
  // والإزاحة يوم: قِيس الحساب على أم القرى ثلاث سنين، فكان بلا إزاحة يبعد
  // يومين في أسوأ حالاته، ومعها يومًا ونصفًا — والأقرب أولى ما دام تقريبًا.
  const jd = julianDay(date.getFullYear(), date.getMonth() + 1, date.getDate()) + 1;
  const l0 = jd - 1948440 + 10632;
  const n = Math.floor((l0 - 1) / 10631);
  let l = l0 - 10631 * n + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  return { day, month, year: 30 * n + j - 30 };
}

/**
 * التاريخ الهجري ليومٍ ميلادي.
 *
 * يُسأل الجهاز أولًا بتقويم أم القرى — وهو المعتمد في الجزيرة، وعليه تُبنى
 * التقاويم المطبوعة — فإن لم يعرفه حُسب حسابًا. ولا يُقرأ الناتج بلغة عربية
 * ثم يُعرض كما هو: نطلبه بأرقام لاتينية ونكتب اسم الشهر بأنفسنا، ليأتي
 * السطر على صورة بقية تواريخ التطبيق لا على صورتين مختلفتين في سطر واحد.
 */
export function hijriOf(date: Date): HijriDate {
  try {
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }).formatToParts(date);
    const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    const day = read("day");
    const month = read("month");
    const year = read("year");
    if ([day, month, year].every((value) => Number.isFinite(value) && value > 0)) {
      return { day, month, year };
    }
  } catch {
    /* جهازٌ لا يعرف التقويم الهجري */
  }
  return tabularHijri(date);
}

/**
 * فرق التقويم العُماني عن أم القرى — يومٌ غالبًا.
 *
 * ‏أم القرى تقويمٌ محسوب تُعلنه السعودية قبل الرؤية، وعُمان تُعلن برؤية
 * مجالسها فتأتي يومًا بعده في الغالب لا دائمًا. ولذلك هو رقمٌ يُضبط من لوحة
 * الإدارة حين يختلف الشهر، لا ثابتٌ في الشفرة أنتظر أنا لأغيّره.
 */
export const HIJRI_OMAN_OFFSET = -1;

/** "4 ربيع الآخر 1448 هـ" بتوقيت عُمان وتقويمها. */
export function omanHijriLabel(at: Date = new Date(), offsetDays = HIJRI_OMAN_OFFSET): string {
  const shifted = new Date(omanNow(at).getTime() + offsetDays * 86_400_000);
  const { day, month, year } = hijriOf(shifted);
  const name = HIJRI_MONTHS[Math.min(Math.max(month, 1), 12) - 1];
  return `${day} ${name} ${year} هـ`;
}

/** السطر الكامل أعلى الصفحة: ميلاديّ وهجريّ وساعة، كلّها بتوقيت عُمان. */
export function omanFullDateLabel(at: Date = new Date(), hijriOffset = HIJRI_OMAN_OFFSET): string {
  const d = omanNow(at);
  const gregorian = `${ARABIC_WEEKDAYS[d.getDay()]} ${d.getDate()} ${ARABIC_MONTHS[d.getMonth()]}`;
  return `${gregorian} · ${omanHijriLabel(at, hijriOffset)} · ${omanClockLabel(at)}`;
}

/** «٤ ربيع الآخر ١٤٤٨ هـ» ليومٍ بعينه — لعناوين التقويم، لا لليوم الحاضر. */
export function hijriLabelFor(isoDate: string, offsetDays = HIJRI_OMAN_OFFSET): string {
  const date = parseIsoDate(isoDate);
  date.setDate(date.getDate() + offsetDays);
  const { day, month, year } = hijriOf(date);
  return `${day} ${HIJRI_MONTHS[Math.min(Math.max(month, 1), 12) - 1]} ${year} هـ`;
}

/** اسم الشهر الهجري وسنته لتاريخٍ ما — يُستعمل لمدى الشهر في رأس التقويم. */
export function hijriMonthOf(date: Date, offsetDays = HIJRI_OMAN_OFFSET): { name: string; year: number; month: number } {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + offsetDays);
  const { month, year } = hijriOf(shifted);
  return { name: HIJRI_MONTHS[Math.min(Math.max(month, 1), 12) - 1], year, month };
}

/** تاريخ اليوم بتوقيت عُمان على صورة «2026-09-17» — للمقارنة مع تواريخ ISO. */
export function omanTodayIso(at: Date = new Date()): string {
  const d = omanNow(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
