/**
 * لوحة الألوان المركزية — طابع بحري عماني: أزرق عميق متدرّج، بلمسة فيروزية
 * مأخوذة من ماء بحر العرب، وذهب هادئ للتكريم فقط.
 *
 * القاعدة: العمق يأتي من تدرّج الأزرق نفسه لا من إضافة ألوان جديدة.
 * أي تغيير هنا ينعكس على كامل التطبيق.
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

export const colors = {
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
} as const;

export type ColorToken = keyof typeof colors;
