import type { Ionicons } from "@expo/vector-icons";

export type ActivityCategory =
  | "Cultural"
  | "SecurityAwareness"
  | "TrafficSafety"
  | "AviationSafety"
  | "Sports"
  | "Shooting"
  | "Lecture"
  | "AntiDrugs"
  | "GeneralSafety"
  | "Announcement";

type IoniconName = keyof typeof Ionicons.glyphMap;

interface CategoryMeta {
  label: string;
  icon: IoniconName;
}

/** تصنيف موحّد لكل الأنشطة — الاسم العربي والأيقونة فقط، بلا ألوان متعددة. */
export const CATEGORY_META: Record<ActivityCategory, CategoryMeta> = {
  Cultural: { label: "ثقافية", icon: "book-outline" },
  SecurityAwareness: { label: "أمنية", icon: "shield-checkmark-outline" },
  TrafficSafety: { label: "السلامة المرورية", icon: "car-outline" },
  AviationSafety: { label: "السلامة الجوية", icon: "airplane-outline" },
  Sports: { label: "رياضية", icon: "football-outline" },
  Shooting: { label: "الرماية", icon: "locate-outline" },
  Lecture: { label: "محاضرات", icon: "mic-outline" },
  AntiDrugs: { label: "مكافحة المخدرات", icon: "leaf-outline" },
  GeneralSafety: { label: "السلامة العامة", icon: "medkit-outline" },
  Announcement: { label: "إعلان", icon: "megaphone-outline" },
};

/** الأقسام المعروضة في الشبكة الرئيسية للصفحة الأولى. */
export const HOME_SECTIONS: Array<{ key: string; label: string; icon: IoniconName; route: string }> = [
  { key: "competitions", label: "المسابقات", icon: "trophy-outline", route: "/sections/competitions" },
  { key: "lectures", label: "المحاضرات", icon: "mic-outline", route: "/sections/lectures" },
  { key: "calendar", label: "التقويم السنوي", icon: "calendar-outline", route: "/calendar" },
  { key: "sports", label: "الأنشطة الرياضية", icon: "football-outline", route: "/sections/sports" },
  { key: "shooting", label: "الرماية", icon: "locate-outline", route: "/sections/shooting" },
  { key: "security", label: "التثقيف الأمني", icon: "shield-checkmark-outline", route: "/awareness/security" },
  { key: "safety", label: "السلامة", icon: "medkit-outline", route: "/sections/safety" },
  { key: "announcements", label: "الإعلانات", icon: "megaphone-outline", route: "/announcements" },
];
