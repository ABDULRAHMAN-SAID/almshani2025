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

/** "15 أكتوبر" */
export function formatArabicDate(isoDate: string): string {
  const d = new Date(isoDate);
  return `${d.getDate()} ${ARABIC_MONTHS[d.getMonth()]}`;
}

/** "الخميس" */
export function formatArabicWeekday(isoDate: string): string {
  return ARABIC_WEEKDAYS[new Date(isoDate).getDay()];
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
  const target = new Date(isoDate);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (diffDays === 0) return "اليوم";
  if (diffDays === 1) return "غدًا";
  if (diffDays > 1) return `بعد ${diffDays} ${diffDays === 2 ? "يومين" : "أيام"}`;
  return formatArabicDate(isoDate);
}
