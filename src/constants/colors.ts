/**
 * لوحة الألوان المركزية — «واجهة»: حبرٌ أخضر داكن، ونحاسٌ هادئ، وورقٌ دافئ.
 *
 * ولماذا هذه؟ لأن الزبون صاحبُ مشروع يريد واجهةً تُشبه محلًّا أنيقًا لا
 * لوحةَ تحكّمٍ تقنية. والأخضر الداكن والنحاس لونا الخليج القديم — الباب
 * والصندوق والقفل — والورقُ الدافئ يُريح العين في شاشةٍ تُقرأ طويلًا.
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

/** سلّم الحبر الأخضر — من عمق الظلّ إلى سطحه. */
export const ink = {
  900: "#0A140F", // أعمق نقطة — خلفية شاشة البداية
  800: "#12201B", // الأساس
  700: "#1B2F26", // أسطح مرفوعة فوق الأساس
  600: "#2A463A", // حدود ولمسات فوق الحبر
  500: "#3D6152", // نص ثانوي فوق الحبر
  300: "#8FAEA0", // أيقونات باهتة فوق الحبر
  100: "#DCE7E1",
  50: "#EDF3EF",
} as const;

/** النحاس — لمسة الثمن والتميّز، تُستعمل بقلّة. */
export const brass = {
  600: "#9A7328",
  500: "#C9963F",
  300: "#E0BC7C",
  100: "#F6EBD6",
} as const;

export type ColorScheme = "light" | "dark";

const light = {
  // الهوية
  primary: ink[800],
  primaryDark: ink[900],
  primaryLight: ink[700],
  primaryMuted: ink[600],
  onPrimaryMuted: ink[300],

  accent: "#A8452A", // طينيّ محروق — للتحذير والتأكيد الحاسم فقط
  accentLight: "#C4674B",
  marine: brass[600], // النحاس — للروابط والحالات النشطة
  marineDeep: brass[500],
  gold: brass[500],

  // الأسطح — ورقٌ دافئ، لا أبيضُ بارد
  background: "#F6F3ED",
  backgroundDeep: "#EDE8DF",
  surface: "#FFFFFF",
  surfaceRaised: "#FCFAF6",
  border: "#E2DCD0",
  borderStrong: "#CFC6B6",

  // النص
  textPrimary: "#14201A",
  textSecondary: "#44574D",
  textMuted: "#7A877F",
  textOnPrimary: "#FFFFFF",
  textOnPrimaryMuted: "rgba(255,255,255,0.72)",

  // الحالات
  success: "#1F7A52",
  successSoft: "#E3F2EA",
  warning: "#8C6516",
  warningSoft: "#F8EFDA",
  danger: "#9E2C1D",
  dangerSoft: "#F9E8E4",
  info: brass[600],
  infoSoft: brass[100],

  overlay: "rgba(10, 20, 15, 0.55)",
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
  primary: "#C9963F",
  primaryDark: "#0A140F",
  primaryLight: "#DCAF5C",
  primaryMuted: "#6B5220",
  onPrimaryMuted: ink[300],

  accent: "#D46B4E",
  accentLight: "#E2896F",
  marine: "#E0BC7C",
  marineDeep: "#C9963F",
  gold: "#E0BC7C",

  background: "#0D1712",
  backgroundDeep: "#080F0C",
  surface: "#16241D",
  surfaceRaised: "#1D2E25",
  border: "#273B31",
  borderStrong: "#35503F",

  textPrimary: "#ECF2EE",
  textSecondary: "#BCCCC2",
  textMuted: "#8B9C92",
  textOnPrimary: "#12201B",
  textOnPrimaryMuted: "rgba(18,32,27,0.68)",

  success: "#4CC48D",
  successSoft: "rgba(76,196,141,0.16)",
  warning: "#DDAE52",
  warningSoft: "rgba(221,174,82,0.16)",
  danger: "#E0705C",
  dangerSoft: "rgba(224,112,92,0.16)",
  info: "#E0BC7C",
  infoSoft: "rgba(224,188,124,0.16)",

  overlay: "rgba(0, 0, 0, 0.66)",
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
