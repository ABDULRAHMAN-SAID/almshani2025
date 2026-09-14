import type { ImageSourcePropType } from "react-native";
import type { ActivityCategory } from "./categories";

/**
 * غلاف مرسوم لكل تصنيف — تدرّج بلون القسم فوقه نقشة الأقواس ورمز القسم.
 * `require` ثابت لأن Metro يحتاج مسارًا حرفيًا، فلا يمكن بناؤه ديناميكيًا.
 */
export const CATEGORY_COVER: Record<ActivityCategory, ImageSourcePropType> = {
  Cultural: require("@assets/images/covers/cover-Cultural.png"),
  SecurityAwareness: require("@assets/images/covers/cover-SecurityAwareness.png"),
  TrafficSafety: require("@assets/images/covers/cover-TrafficSafety.png"),
  AviationSafety: require("@assets/images/covers/cover-AviationSafety.png"),
  Sports: require("@assets/images/covers/cover-Sports.png"),
  Shooting: require("@assets/images/covers/cover-Shooting.png"),
  Lecture: require("@assets/images/covers/cover-Lecture.png"),
  AntiDrugs: require("@assets/images/covers/cover-AntiDrugs.png"),
  GeneralSafety: require("@assets/images/covers/cover-GeneralSafety.png"),
  Announcement: require("@assets/images/covers/cover-Announcement.png"),
};
