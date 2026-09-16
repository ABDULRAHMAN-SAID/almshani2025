import { colors } from "@/constants/colors";
import type { RegistrationState } from "@/types/models";

export const REGISTRATION_LABEL: Record<RegistrationState, string> = {
  open: "التسجيل مفتوح",
  closed: "التسجيل مغلق",
  upcoming: "قريبًا",
  ended: "انتهى",
  full: "اكتمل العدد",
};

// دوالّ قراءة لا قيمًا: الكائن يُبنى مرّةً عند تحميل الملفّ، ولو حُفظ اللون
// فيه لتجمّد على لوحة النهار وبقيت الحالة خضراءَ النهار في مظهر الليل.
export const REGISTRATION_COLOR: Record<RegistrationState, string> = {
  get open() {
    return colors.success;
  },
  get closed() {
    return colors.textMuted;
  },
  get upcoming() {
    return colors.gold;
  },
  get ended() {
    return colors.textMuted;
  },
  get full() {
    return colors.warning;
  },
};
