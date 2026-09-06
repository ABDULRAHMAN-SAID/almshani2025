export interface ArabicPluralForms {
  /** صيغة المفرد كاملة، مثل: "نشاط واحد" */
  one: string;
  /** صيغة المثنى كاملة، مثل: "نشاطان" */
  two: string;
  /** جمع القلة (3-10)، يُسبق بالعدد، مثل: "أنشطة" */
  few: string;
  /** التمييز المفرد المنصوب (11 فأكثر)، يُسبق بالعدد، مثل: "نشاطًا" */
  many: string;
}

/** صياغة عربية صحيحة للعدد: نشاط واحد / نشاطان / 3 أنشطة / 11 نشاطًا. */
export function pluralizeAr(count: number, forms: ArabicPluralForms): string {
  if (count === 1) return forms.one;
  if (count === 2) return forms.two;
  if (count >= 3 && count <= 10) return `${count} ${forms.few}`;
  return `${count} ${forms.many}`;
}

export const ACTIVITY_FORMS: ArabicPluralForms = {
  one: "نشاط واحد",
  two: "نشاطان",
  few: "أنشطة",
  many: "نشاطًا",
};

export const QUESTION_FORMS: ArabicPluralForms = {
  one: "سؤال واحد",
  two: "سؤالان",
  few: "أسئلة",
  many: "سؤالًا",
};
