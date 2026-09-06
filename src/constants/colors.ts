/**
 * لوحة الألوان المركزية — طابع عماني حديث، رسمي، هادئ.
 * أي تغيير هنا ينعكس على كامل التطبيق.
 */
export const colors = {
  primary: "#0B2545",
  primaryDark: "#071A33",
  primaryLight: "#1D3A63",
  accent: "#A11D2C",
  accentLight: "#C23B4B",
  gold: "#C7A252",

  background: "#F5F6F8",
  surface: "#FFFFFF",
  border: "#E4E7EC",

  textPrimary: "#18202A",
  textMuted: "#75808F",
  textOnPrimary: "#FFFFFF",

  success: "#1E8E5A",
  warning: "#B7791F",
  danger: "#B3261E",

  overlay: "rgba(11, 37, 69, 0.45)",
} as const;

export type ColorToken = keyof typeof colors;
