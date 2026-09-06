import type { Activity } from "@/types/models";

/** أسماء أيام الأسبوع مختصرة — الأسبوع يبدأ بالأحد. */
export const ARABIC_WEEKDAYS_SHORT = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

const pad = (n: number) => String(n).padStart(2, "0");

/** تاريخ ISO محلي (بدون انزياح المنطقة الزمنية الذي يسببه toISOString). */
export function toLocalIso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const TODAY_ISO = toLocalIso(new Date());

export interface CalendarCell {
  iso: string | null;
  day: number | null;
  isToday: boolean;
}

/** يبني شبكة الشهر (صفوف كاملة من 7 أيام، مع خانات فارغة للحشو). */
export function buildMonthGrid(year: number, monthIndex: number): CalendarCell[] {
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: CalendarCell[] = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push({ iso: null, day: null, isToday: false });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
    cells.push({ iso, day, isToday: iso === TODAY_ISO });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ iso: null, day: null, isToday: false });
  }
  return cells;
}

/** تجميع الأنشطة حسب اليوم (مفتاح: التاريخ ISO). */
export function groupActivitiesByDate(activities: Activity[]): Record<string, Activity[]> {
  return activities.reduce<Record<string, Activity[]>>((map, activity) => {
    (map[activity.date] ||= []).push(activity);
    return map;
  }, {});
}

/** تجميع الأنشطة حسب الشهر (مفتاح: 0-11) للعرض السنوي. */
export function groupActivitiesByMonth(activities: Activity[], year: number): Record<number, Activity[]> {
  return activities.reduce<Record<number, Activity[]>>((map, activity) => {
    const date = new Date(activity.date);
    if (date.getFullYear() !== year) return map;
    (map[date.getMonth()] ||= []).push(activity);
    return map;
  }, {});
}
