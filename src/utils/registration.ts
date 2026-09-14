import { colors } from "@/constants/colors";
import type { RegistrationState } from "@/types/models";

export const REGISTRATION_LABEL: Record<RegistrationState, string> = {
  open: "التسجيل مفتوح",
  closed: "التسجيل مغلق",
  upcoming: "قريبًا",
  ended: "انتهى",
  full: "اكتمل العدد",
};

export const REGISTRATION_COLOR: Record<RegistrationState, string> = {
  open: colors.success,
  closed: colors.textMuted,
  upcoming: colors.gold,
  ended: colors.textMuted,
  full: colors.warning,
};
