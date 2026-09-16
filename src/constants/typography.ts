import { getColorScheme, paletteOf, type ColorScheme } from "./colors";

/**
 * نظام الطباعة — خط Tajawal العربي الاحترافي.
 * التسلسل الهرمي: عنوان كبير → عنوان قسم → معلومة مهمة → نص عادي → ملاحظة.
 *
 * و`typography` وكيلٌ كما `colors`: كلّ مقاسٍ فيه يحمل لونًا، واللون يتبع
 * المظهر. فتُبنى المقاسات لكل مظهرٍ مرّةً واحدة وتُقرأ منها عند الطلب.
 */
export const fontFamily = {
  regular: "Tajawal_400Regular",
  medium: "Tajawal_500Medium",
  bold: "Tajawal_700Bold",
} as const;

function build(scheme: ColorScheme) {
  const c = paletteOf(scheme);
  return {
    h1: { fontFamily: fontFamily.bold, fontSize: 24, lineHeight: 32, color: c.textPrimary },
    h2: { fontFamily: fontFamily.bold, fontSize: 20, lineHeight: 28, color: c.textPrimary },
    h3: { fontFamily: fontFamily.medium, fontSize: 17, lineHeight: 24, color: c.textPrimary },
    body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22, color: c.textPrimary },
    bodyMuted: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, color: c.textMuted },
    caption: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18, color: c.textMuted },
    button: { fontFamily: fontFamily.medium, fontSize: 15, lineHeight: 20, color: c.textOnPrimary },
  } as const;
}

export type Typography = ReturnType<typeof build>;

const cache: Partial<Record<ColorScheme, Typography>> = {};

export const typography: Typography = new Proxy({} as Typography, {
  get(_target, key) {
    const scheme = getColorScheme();
    const set = (cache[scheme] ??= build(scheme));
    return set[key as keyof Typography];
  },
  ownKeys() {
    const scheme = getColorScheme();
    return Reflect.ownKeys((cache[scheme] ??= build(scheme)));
  },
  getOwnPropertyDescriptor(_target, key) {
    const scheme = getColorScheme();
    const set = (cache[scheme] ??= build(scheme));
    const value = set[key as keyof Typography];
    return value === undefined
      ? undefined
      : { value, enumerable: true, configurable: true, writable: false };
  },
});
