import type { ActivityCategory } from "./categories";

export interface SectionDefinition {
  key: string;
  title: string;
  subtitle: string;
  categories: ActivityCategory[];
  /** فلاتر فرعية داخل الشاشة؛ الأول دائمًا "الكل". */
  filters: { key: string; label: string; categories: ActivityCategory[] }[];
}

/** تعريف شاشات الأقسام — تشترك كلها في مسار واحد `app/sections/[key].tsx`. */
export const SECTION_DEFINITIONS: Record<string, SectionDefinition> = {
  competitions: {
    key: "competitions",
    title: "المسابقات",
    subtitle: "المسابقات الثقافية والتوعوية على مدار العام",
    categories: ["Cultural", "SecurityAwareness", "TrafficSafety", "AviationSafety"],
    filters: [
      { key: "all", label: "الكل", categories: [] },
      { key: "cultural", label: "ثقافية", categories: ["Cultural"] },
      { key: "security", label: "أمنية", categories: ["SecurityAwareness"] },
      { key: "traffic", label: "السلامة المرورية", categories: ["TrafficSafety"] },
      { key: "aviation", label: "السلامة الجوية", categories: ["AviationSafety"] },
    ],
  },
  lectures: {
    key: "lectures",
    title: "المحاضرات",
    subtitle: "محاضرات توعوية وثقافية وتطوير ذات",
    categories: ["Lecture"],
    filters: [{ key: "all", label: "الكل", categories: [] }],
  },
  sports: {
    key: "sports",
    title: "الأنشطة الرياضية",
    subtitle: "البطولات والفعاليات الرياضية",
    categories: ["Sports"],
    filters: [{ key: "all", label: "الكل", categories: [] }],
  },
  shooting: {
    key: "shooting",
    title: "الرماية",
    subtitle: "تنظيم نشاط الرماية والتسجيل فيه",
    categories: ["Shooting"],
    filters: [{ key: "all", label: "الكل", categories: [] }],
  },
  safety: {
    key: "safety",
    title: "السلامة",
    subtitle: "السلامة المرورية والعامة والجوية والإسعافات الأولية",
    categories: ["GeneralSafety", "TrafficSafety", "AviationSafety"],
    filters: [
      { key: "all", label: "الكل", categories: [] },
      { key: "traffic", label: "مرورية", categories: ["TrafficSafety"] },
      { key: "general", label: "عامة", categories: ["GeneralSafety"] },
      { key: "aviation", label: "جوية", categories: ["AviationSafety"] },
    ],
  },
};
