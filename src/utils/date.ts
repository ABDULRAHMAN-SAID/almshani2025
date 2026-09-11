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
