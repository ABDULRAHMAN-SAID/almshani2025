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
  /** لمسة لون هادئة خاصة بالقسم — تُستخدم للأيقونة وخلفيتها بدرجة منخفضة جدًا. */
  tint: string;
}

/** تصنيف موحّد لكل الأنشطة: الاسم العربي، الأيقونة، ولمسة اللون. */
export const CATEGORY_META: Record<ActivityCategory, CategoryMeta> = {
  Cultural: { label: "ثقافية", icon: "book-outline", tint: "#2C5282" },
  SecurityAwareness: { label: "أمنية", icon: "shield-checkmark-outline", tint: "#434190" },
  TrafficSafety: { label: "السلامة المرورية", icon: "car-outline", tint: "#B7791F" },
  AviationSafety: { label: "السلامة الجوية", icon: "airplane-outline", tint: "#2C7A7B" },
  Sports: { label: "رياضية", icon: "football-outline", tint: "#2F855A" },
  Shooting: { label: "الرماية", icon: "locate-outline", tint: "#A11D2C" },
  Lecture: { label: "محاضرات", icon: "mic-outline", tint: "#0B2545" },
  AntiDrugs: { label: "مكافحة المخدرات", icon: "leaf-outline", tint: "#276749" },
  GeneralSafety: { label: "السلامة العامة", icon: "medkit-outline", tint: "#9B2C2C" },
  Announcement: { label: "إعلان", icon: "megaphone-outline", tint: "#8A6D2C" },
};

export interface HomeSection {
  key: string;
  label: string;
  icon: IoniconName;
  tint: string;
  route: string;
}

/** الأقسام المعروضة في شبكة الأيقونات الرئيسية (أعلى الصفحة الرئيسية). */
export const HOME_SECTIONS: HomeSection[] = [
  { key: "competitions", label: "المسابقات", icon: "trophy-outline", tint: "#C7A252", route: "/sections/competitions" },
  { key: "lectures", label: "المحاضرات", icon: "mic-outline", tint: "#0B2545", route: "/sections/lectures" },
  { key: "calendar", label: "التقويم", icon: "calendar-outline", tint: "#2C7A7B", route: "/calendar" },
  { key: "sports", label: "الرياضة", icon: "football-outline", tint: "#2F855A", route: "/sections/sports" },
  { key: "shooting", label: "الرماية", icon: "locate-outline", tint: "#A11D2C", route: "/sections/shooting" },
  // ‏/(tabs)/awareness لا /awareness: الثاني مجلّد صفحته الوحيدة [id]، فالمسار
  // المجرّد منه لا يطابق شاشةً ويقع على «غير موجود».
  { key: "security", label: "التثقيف الأمني", icon: "shield-checkmark-outline", tint: "#434190", route: "/(tabs)/awareness" },
  { key: "safety", label: "السلامة", icon: "medkit-outline", tint: "#B7791F", route: "/sections/safety" },
  { key: "announcements", label: "الإعلانات", icon: "megaphone-outline", tint: "#9B2C2C", route: "/announcements" },
  { key: "news", label: "الأخبار", icon: "newspaper-outline", tint: "#1A5F7A", route: "/news" },
  { key: "quiz", label: "سؤال الأسبوع", icon: "help-circle-outline", tint: "#2C5282", route: "/quiz" },
  { key: "groups", label: "المجموعات النقاشية", icon: "chatbubbles-outline", tint: "#158A99", route: "/groups" },
  { key: "messages", label: "مراسلة الإدارة", icon: "mail-outline", tint: "#1C4468", route: "/compose" },
  { key: "contact", label: "تواصل معنا", icon: "call-outline", tint: "#0F6E7B", route: "/contact" },
];

/** تحويل لون إلى خلفية خفيفة جدًا بنفس الدرجة (شفافية ~10%). */
export function tintBackground(tint: string, opacity = 0.1): string {
  const hex = tint.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/** فلاتر التقويم — تجميع التصنيفات في مجموعات يفهمها المستخدم. */
export interface CalendarFilter {
  key: string;
  label: string;
  categories: ActivityCategory[];
}

export const CALENDAR_FILTERS: CalendarFilter[] = [
  { key: "all", label: "الكل", categories: [] },
  { key: "competitions", label: "المسابقات", categories: ["Cultural", "TrafficSafety", "AviationSafety", "SecurityAwareness"] },
  { key: "lectures", label: "المحاضرات", categories: ["Lecture"] },
  { key: "sports", label: "الرياضة", categories: ["Sports"] },
  { key: "shooting", label: "الرماية", categories: ["Shooting"] },
  { key: "awareness", label: "التوعية", categories: ["AntiDrugs", "SecurityAwareness"] },
  { key: "safety", label: "السلامة", categories: ["GeneralSafety", "TrafficSafety", "AviationSafety"] },
];

/* -------------------------------- الأخبار -------------------------------- */

/**
 * تسمية نطاق الخبر، في موضع واحد.
 *
 * كانت مكتوبة في أربعة ملفّات: البطاقة، وصفحة الخبر، وفلاتر الأخبار، وشاشة
 * النشر. وتغيير كلمة واحدة كان يعني تتبّعها في أربعة أماكن ونسيان واحد منها
 * — وهو صنف الخلل الذي جعل قسم الأخبار لا يفتح أصلًا.
 */
export const NEWS_SCOPE_LABEL: Record<"oman" | "world", string> = {
  oman: "محلي",
  world: "دولي",
};
