/**
 * لوحة الألوان المركزية — طابع بحري عماني: أزرق عميق متدرّج، بلمسة فيروزية
 * مأخوذة من ماء بحر العرب، وذهب هادئ للتكريم فقط.
 *
 * القاعدة: العمق يأتي من تدرّج الأزرق نفسه لا من إضافة ألوان جديدة.
 * أي تغيير هنا ينعكس على كامل التطبيق.
 *
 * ولوحتان لا واحدة: فاتحة وداكنة. و`colors` المصدَّر ليس كائنًا ثابتًا بل
 * وكيلٌ (Proxy) يقرأ من اللوحة النشطة لحظة الطلب — فكلّ `colors.primary`
 * في التطبيق يعود باللون الصحيح للمظهر الحالي بلا أن يتغيّر سطرٌ في مئة
 * شاشة. أمّا الأنماط المبنيّة بـ StyleSheet.create فتُقرأ مرّةً عند تحميل
 * الملفّ وتتجمّد، ولذلك تُبنى بـ `themed()` — انظر theme.ts.
 */

/** سلّم الأزرق البحري — من عمق الماء إلى سطحه. */
export const navy = {
  900: "#061729", // أعمق نقطة — خلفية شاشة البداية
  800: "#0A2340", // الأساس الرسمي
  700: "#123253", // أسطح مرفوعة فوق الأساس
  600: "#1C4468", // حدود ولمسات فوق الكحلي
  500: "#2C5C85", // نص ثانوي فوق الكحلي
  300: "#7FA3C4", // أيقونات باهتة فوق الكحلي
  100: "#DDE7F1", // خلفية لمسة زرقاء فاتحة
  50: "#EEF3F8",
} as const;

/** الفيروزي البحري — لمسة الحياة في الواجهة، تُستعمل بقلّة. */
export const marine = {
  600: "#0F6E7B",
  500: "#158A99",
  300: "#6EBFC9",
  100: "#DCEFF2",
} as const;

export type ColorScheme = "light" | "dark";

const light = {
  // الهوية
  primary: navy[800],
  primaryDark: navy[900],
  primaryLight: navy[700],
  primaryMuted: navy[600],
  onPrimaryMuted: navy[300],

  accent: "#A11D2C", // الأحمر العماني — للتحذير والتأكيد الحاسم فقط
  accentLight: "#C23B4B",
  marine: marine[500], // الفيروزي البحري — للروابط والحالات النشطة
  marineDeep: marine[600],
  gold: "#B8912F", // للجوائز والمراكز فقط

  // الأسطح — رمادي مائل للأزرق، لا رمادي محايد
  background: "#F2F5F9",
  backgroundDeep: "#E7EDF4",
  surface: "#FFFFFF",
  surfaceRaised: "#FBFCFE",
  border: "#D8E1EC",
  borderStrong: "#C2D0E0",

  // النص
  textPrimary: "#0E1C2B",
  textSecondary: "#3C5570",
  textMuted: "#6B819A",
  textOnPrimary: "#FFFFFF",
  textOnPrimaryMuted: "rgba(255,255,255,0.72)",

  // الحالات
  success: "#137A56",
  successSoft: "#E4F3ED",
  warning: "#9A6B14",
  warningSoft: "#FAF0DC",
  danger: "#A32218",
  dangerSoft: "#FBE9E7",
  info: marine[500],
  infoSoft: marine[100],

  overlay: "rgba(6, 23, 41, 0.52)",
};

export type Colors = { [K in keyof typeof light]: string };

/**
 * اللوحة الداكنة — الليل على الماء نفسه.
 *
 * الخلفية كحليّ عميق لا أسود: الأسود الصرف يقطع الطابع البحري ويجعل
 * البطاقات تطفو بلا أرض. والأساسي فاتحٌ بدرجتين عن النهار، وإلّا غاص
 * الكحلي في الكحلي فاختفت الأزرار. والنصّ أبيض مائل للزرقة لا أبيض
 * ناصع — الناصع على الداكن يُبهر العين في الظلمة.
 */
const dark: Colors = {
  primary: "#3B74B8",
  primaryDark: "#0A2340",
  primaryLight: "#4F86C6",
  primaryMuted: "#2A4E78",
  onPrimaryMuted: navy[300],

  accent: "#D4525F",
  accentLight: "#E27A84",
  marine: "#3FB1C0",
  marineDeep: "#2C97A6",
  gold: "#D3AE55",

  background: "#0A1424",
  backgroundDeep: "#060F1C",
  surface: "#132239",
  surfaceRaised: "#182B45",
  border: "#22395A",
  borderStrong: "#2E4A6E",

  textPrimary: "#E8EFF7",
  textSecondary: "#B7C7D9",
  textMuted: "#8AA0B8",
  textOnPrimary: "#FFFFFF",
  textOnPrimaryMuted: "rgba(255,255,255,0.72)",

  success: "#3FBF8A",
  successSoft: "rgba(63,191,138,0.16)",
  warning: "#D9A441",
  warningSoft: "rgba(217,164,65,0.16)",
  danger: "#E05A4F",
  dangerSoft: "rgba(224,90,79,0.16)",
  info: "#3FB1C0",
  infoSoft: "rgba(63,177,192,0.16)",

  overlay: "rgba(0, 0, 0, 0.62)",
};

export const palettes: Record<ColorScheme, Colors> = { light, dark };

let activeScheme: ColorScheme = "light";

/** المظهر النشط الآن — يقرأه كلّ من يبني لونًا أو نمطًا. */
export function getColorScheme(): ColorScheme {
  return activeScheme;
}

/**
 * يبدّل اللوحة النشطة. ولا يُعيد رسم شيء بنفسه: من بدّل المظهر عليه أن
 * يُعيد تركيب الشجرة (انظر app/_layout.tsx) لتُقرأ اللوحة الجديدة.
 */
export function setColorScheme(scheme: ColorScheme): void {
  activeScheme = scheme;
}

/** اللوحة النشطة كائنًا صريحًا — لمن يحتاج القيم كلّها دفعةً واحدة. */
export function paletteOf(scheme: ColorScheme = activeScheme): Colors {
  return palettes[scheme];
}

export const colors: Colors = new Proxy(light as Colors, {
  get(_target, key) {
    return palettes[activeScheme][key as keyof Colors];
  },
  // ‏Object.keys(colors) وما شابهها تقرأ من اللوحة النشطة لا من الفاتحة.
  ownKeys() {
    return Reflect.ownKeys(palettes[activeScheme]);
  },
  getOwnPropertyDescriptor(_target, key) {
    const value = palettes[activeScheme][key as keyof Colors];
    return value === undefined
      ? undefined
      : { value, enumerable: true, configurable: true, writable: false };
  },
});

export type ColorToken = keyof Colors;
