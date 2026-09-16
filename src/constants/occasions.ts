import { hijriOf, HIJRI_OMAN_OFFSET } from "@/utils/date";

/**
 * المناسبات التي تُعلَّم في التقويم.
 *
 * وهي نوعان لا نوع واحد، ولكلٍّ طريقة:
 *
 * ١) مناسبةٌ ميلادية ثابتة — يومٌ وشهرٌ لا يتغيّران، كاليوم الوطني. تُكتب هنا
 *    بيدٍ، لأن لا حساب يُخرجها.
 *
 * ٢) مناسبةٌ هجرية — تتقدّم في التقويم الميلادي أحد عشر يومًا كل سنة، فلو
 *    كُتبت بيدٍ لصحّت سنةً وكذبت ما بعدها. وهذه تُحسب من التقويم الهجري نفسه
 *    الذي يعرضه التطبيق، فتصحّ كل سنة بلا أن يمسّها أحد.
 *
 * ▼▼ ولمن يصحّح أو يزيد: أسطر MILADI أدناه هي الموضع. ▼▼
 * والمناسبات العسكرية للقاعدة أو للسلاح تُضاف هنا بالضبط كما في اللوحة
 * الرسمية — ولا تُخمَّن: تقويمٌ رسميٌّ فيه تاريخٌ مخترَع أسوأ من تقويمٍ ناقص.
 */

export interface Occasion {
  label: string;
  /** رسمية الدولة تُلوَّن ذهبًا، والدينية خضراء، والعسكرية كحلية. */
  kind: "state" | "religious" | "military";
}

interface MiladiOccasion extends Occasion {
  month: number; // ١–١٢
  day: number;
}

interface HijriOccasion extends Occasion {
  hijriMonth: number; // ١–١٢
  hijriDay: number;
}

/** مناسبات بتاريخ ميلادي ثابت. */
export const MILADI: MiladiOccasion[] = [
  { month: 1, day: 11, label: "ذكرى تولّي جلالة السلطان مقاليد الحكم", kind: "state" },
  { month: 7, day: 23, label: "يوم النهضة", kind: "state" },
  { month: 10, day: 17, label: "يوم المرأة العُمانية", kind: "state" },
  { month: 11, day: 18, label: "اليوم الوطني", kind: "state" },
  { month: 12, day: 11, label: "يوم قوات السلطان المسلحة", kind: "military" },
];

/** مناسبات بتاريخ هجري — تُحسب كل سنة. */
export const HIJRI: HijriOccasion[] = [
  { hijriMonth: 1, hijriDay: 1, label: "رأس السنة الهجرية", kind: "religious" },
  { hijriMonth: 3, hijriDay: 12, label: "المولد النبوي الشريف", kind: "religious" },
  { hijriMonth: 7, hijriDay: 27, label: "الإسراء والمعراج", kind: "religious" },
  { hijriMonth: 9, hijriDay: 1, label: "أول رمضان", kind: "religious" },
  { hijriMonth: 10, hijriDay: 1, label: "عيد الفطر المبارك", kind: "religious" },
  { hijriMonth: 12, hijriDay: 10, label: "عيد الأضحى المبارك", kind: "religious" },
];

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * مناسبات سنةٍ كاملة، مفهرسةً بتاريخها: «2026-11-18» ← [اليوم الوطني].
 *
 * والهجرية تُلتقط بمسح أيام السنة يومًا يومًا ومطابقة تاريخها الهجري — لا
 * بجدول مكتوب. والمسح مرّةٌ واحدة لكل سنة تُفتح، ونتيجته تُحفظ.
 */
export function occasionsOfYear(
  year: number,
  hijriOffset: number = HIJRI_OMAN_OFFSET
): Record<string, Occasion[]> {
  const map: Record<string, Occasion[]> = {};
  const add = (iso: string, occasion: Occasion) => {
    (map[iso] ??= []).push(occasion);
  };

  for (const item of MILADI) {
    add(`${year}-${pad(item.month)}-${pad(item.day)}`, { label: item.label, kind: item.kind });
  }

  const cursor = new Date(year, 0, 1, 12);
  while (cursor.getFullYear() === year) {
    const shifted = new Date(cursor);
    shifted.setDate(shifted.getDate() - hijriOffset);
    const hijri = hijriOf(shifted);
    for (const item of HIJRI) {
      if (hijri.month === item.hijriMonth && hijri.day === item.hijriDay) {
        add(
          `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`,
          { label: item.label, kind: item.kind }
        );
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return map;
}

export const OCCASION_TINT: Record<Occasion["kind"], string> = {
  state: "#B8912F",
  religious: "#137A56",
  military: "#1C4468",
};
