import { colors } from "./colors";

/**
 * نظام الطباعة — خط Tajawal العربي الاحترافي.
 * التسلسل الهرمي: عنوان كبير → عنوان قسم → معلومة مهمة → نص عادي → ملاحظة.
 */
export const fontFamily = {
  regular: "Tajawal_400Regular",
  medium: "Tajawal_500Medium",
  bold: "Tajawal_700Bold",
} as const;

export const typography = {
  h1: { fontFamily: fontFamily.bold, fontSize: 24, lineHeight: 32, color: colors.textPrimary },
  h2: { fontFamily: fontFamily.bold, fontSize: 20, lineHeight: 28, color: colors.textPrimary },
  h3: { fontFamily: fontFamily.medium, fontSize: 17, lineHeight: 24, color: colors.textPrimary },
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22, color: colors.textPrimary },
  bodyMuted: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  caption: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  button: { fontFamily: fontFamily.medium, fontSize: 15, lineHeight: 20, color: colors.textOnPrimary },
} as const;
