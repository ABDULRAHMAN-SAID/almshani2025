/**
 * جدول رحلات سلاح الجو من السيب والمصنعة.
 *
 * منقولٌ حرفًا حرفًا عن الورقة الصادرة: «EFFECTIVE FROM 19 SEP 2026 — UNTIL
 * FURTHER NOTICE». وهو ثابت لا يتغيّر كل أسبوع، فمكانه الشفرة لا خانة تُملأ:
 * يُقرأ بلا إنترنت، ويُبحث فيه بيوم، ولا ينتظر أحدًا يرفع صورة.
 *
 * وحين تصدر ورقة جديدة يُبدَّل ما هنا ويُنشر تحديث — والورقة الأصلية تُرفع
 * من لوحة الإدارة وتظهر أسفل الشاشة، ليقابل من شاء المكتوبَ بالمصوَّر.
 *
 * وقراءة الخانة في الورقة: الرقم الأيسر وصول، والأيمن إقلاع. فخانة خصب يوم
 * الأحد — «MUSN 10:00 / 10:50 KHAS 11:50 / 12:40 MUSN» — تعني: تقلع من
 * المصنعة ١٠:٠٠، تصل خصب ١٠:٥٠، تقلع منها ١١:٥٠، وتعود المصنعة ١٢:٤٠.
 */

import type { Announcement } from "@/types/models";

/** أيام الأسبوع في الجدول — لا جمعة فيه. */
export const FLIGHT_DAYS = [
  "السبت",
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
] as const;
export type FlightDay = (typeof FLIGHT_DAYS)[number];

/** محطّة في مسار الرحلة: وصولٌ إليها، وإقلاعٌ منها، وأحدهما يغيب في الطرفين. */
export interface FlightStop {
  place: string;
  arrive?: string;
  depart?: string;
}

export interface Flight {
  /** معرّف الصفّ على الخادم — يغيب في الجدول المكتوب داخل التطبيق. */
  id?: string;
  /** الوجهة التي تُنسب إليها الرحلة في الورقة. */
  station: string;
  /** يومها، ويغيب في محطّة بلا جدول ثابت. */
  day: FlightDay | "";
  /** الطائرة ورقمها كما في الورقة. */
  aircraft: string;
  stops: FlightStop[];
  /** نصّ محطّة بلا جدول ثابت — «رحلة واحدة كل أسبوعين». */
  note?: string;
}

const MUSN = "المصنعة";
const SEEB = "السيب";

export const FLIGHTS: Flight[] = [
  // ------------------------------- خصب -------------------------------
  {
    station: "خصب",
    day: "الأحد",
    aircraft: "C-130 · T92",
    stops: [
      { place: MUSN, depart: "10:00" },
      { place: "خصب", arrive: "10:50", depart: "11:50" },
      { place: MUSN, arrive: "12:40" },
    ],
  },
  {
    station: "خصب",
    day: "الاثنين",
    aircraft: "C-130 · T44",
    stops: [
      { place: MUSN, depart: "09:00" },
      { place: "خصب", arrive: "09:50", depart: "10:50" },
      { place: MUSN, arrive: "11:40" },
    ],
  },
  {
    station: "خصب",
    day: "الأربعاء",
    aircraft: "CASA · T60",
    stops: [
      { place: MUSN, depart: "09:00" },
      { place: "خصب", arrive: "09:50", depart: "10:50" },
      { place: MUSN, arrive: "11:40" },
    ],
  },
  {
    station: "خصب",
    day: "الخميس",
    aircraft: "C-130 · T92",
    stops: [
      { place: MUSN, depart: "09:30" },
      { place: "خصب", arrive: "10:20", depart: "11:20" },
      { place: MUSN, arrive: "12:10" },
    ],
  },

  // ------------------------------ ثمريت ------------------------------
  {
    station: "ثمريت",
    day: "الأحد",
    aircraft: "A BUS · 134",
    stops: [
      { place: SEEB, depart: "13:45" },
      { place: "ثمريت", arrive: "14:55", depart: "15:55" },
      { place: SEEB, arrive: "17:05" },
    ],
  },
  {
    station: "ثمريت",
    day: "الثلاثاء",
    aircraft: "A BUS · 134",
    stops: [
      { place: SEEB, depart: "09:00" },
      { place: "ثمريت", arrive: "10:10", depart: "11:10" },
      { place: SEEB, arrive: "12:20" },
    ],
  },
  {
    station: "ثمريت",
    day: "الأربعاء",
    aircraft: "C-130 · T92",
    stops: [
      { place: SEEB, depart: "11:30" },
      { place: "ثمريت", arrive: "13:15", depart: "14:15" },
      { place: SEEB, arrive: "16:00" },
    ],
  },
  {
    station: "ثمريت",
    day: "الخميس",
    aircraft: "A BUS · 134",
    stops: [
      { place: SEEB, depart: "09:00" },
      { place: "ثمريت", arrive: "10:10", depart: "11:10" },
      { place: SEEB, arrive: "12:20" },
    ],
  },

  // ------------------------------ صلالة ------------------------------
  {
    station: "صلالة",
    day: "الأحد",
    aircraft: "A BUS · 134",
    stops: [
      { place: SEEB, depart: "09:00" },
      { place: "صلالة", arrive: "10:15", depart: "11:30" },
      { place: SEEB, arrive: "12:45" },
    ],
  },
  {
    station: "صلالة",
    day: "الاثنين",
    aircraft: "A BUS · 134",
    stops: [
      { place: SEEB, depart: "12:20" },
      { place: "صلالة", arrive: "13:35", depart: "14:50" },
      { place: SEEB, arrive: "16:05" },
    ],
  },
  {
    station: "صلالة",
    day: "الثلاثاء",
    aircraft: "A BUS · 134",
    stops: [
      { place: SEEB, depart: "13:20" },
      { place: "صلالة", arrive: "14:35", depart: "15:50" },
      { place: SEEB, arrive: "17:05" },
    ],
  },
  {
    station: "صلالة",
    day: "الأربعاء",
    aircraft: "A BUS · 134",
    stops: [
      { place: SEEB, depart: "10:00" },
      { place: "صلالة", arrive: "11:15", depart: "12:30" },
      { place: SEEB, arrive: "13:45" },
    ],
  },
  {
    station: "صلالة",
    day: "الخميس",
    aircraft: "A BUS · 134",
    stops: [
      { place: SEEB, depart: "13:30" },
      { place: "صلالة", arrive: "14:45", depart: "16:00" },
      { place: SEEB, arrive: "17:15" },
    ],
  },

  // ------------------------------ مصيرة ------------------------------
  {
    station: "مصيرة",
    day: "السبت",
    aircraft: "A BUS · 134",
    stops: [
      { place: SEEB, depart: "19:00" },
      { place: "مصيرة", arrive: "19:40", depart: "20:40" },
      { place: SEEB, arrive: "21:20" },
    ],
  },
  {
    station: "مصيرة",
    day: "الاثنين",
    aircraft: "A BUS · 134",
    stops: [
      { place: SEEB, depart: "09:00" },
      { place: "مصيرة", arrive: "09:40", depart: "10:40" },
      { place: SEEB, arrive: "11:20" },
    ],
  },
  {
    station: "مصيرة",
    day: "الثلاثاء",
    aircraft: "C-130 · T92",
    stops: [
      { place: MUSN, depart: "17:30" },
      { place: "مصيرة", arrive: "18:20", depart: "19:20" },
      { place: MUSN, arrive: "20:10" },
    ],
  },
  {
    station: "مصيرة",
    day: "الأربعاء",
    aircraft: "A BUS · 134",
    stops: [
      { place: SEEB, depart: "15:00" },
      { place: "مصيرة", arrive: "15:40", depart: "16:40" },
      { place: SEEB, arrive: "17:20" },
    ],
  },
  {
    station: "مصيرة",
    day: "الخميس",
    aircraft: "C-130 · T92",
    stops: [
      { place: SEEB, depart: "14:00" },
      { place: "مصيرة", arrive: "14:50", depart: "15:50" },
      { place: SEEB, arrive: "16:40" },
    ],
  },
];



export const FLIGHT_EFFECTIVE = "ساري من ١٩ سبتمبر ٢٠٢٦ حتى إشعار آخر";
export const FLIGHT_SOURCE = "جدول رحلات سلاح الجو السلطاني العماني — من السيب والمصنعة";

/* ---------------------------- تنبيهات بتاريخ ---------------------------- */


/**
 * تغييرٌ ليومٍ بعينه، لا للجدول.
 *
 * تصل رسالةٌ مساء الأربعاء: «توقيت رحلة يوم غدٍ الخميس: التسجيل من السيب
 * ٠٩:٠٠ والإقلاع ١٢:٠٠». وهذا ليس جدولًا جديدًا — الجدول يقول الخميس ١٣:٣٠ ويعود
 * إليه الأسبوعَ التالي — فلو كُتب في صفّ الخميس لكذب الصفُّ بعد أسبوع.
 *
 * فيُكتب هنا بتاريخه: يظهر بطاقةً بارزة فوق رحلات يومه، ويُعلَّم صفُّ
 * الرحلة المعتاد بأنه تغيّر، ثم يختفي وحده بانقضاء يومه. والتسجيل يُذكر
 * لأنه ما يسأل عنه الراكب أوّلًا، والجدول المطبوع لا يحمله.
 */
export interface FlightNoticeLeg {
  from: string;
  checkIn: string;
  depart: string;
}

export interface FlightNotice {
  /** «2026-09-17» */
  date: string;
  day: FlightDay;
  station: string;
  legs: FlightNoticeLeg[];
}

export const FLIGHT_NOTICES: FlightNotice[] = [
  {
    date: "2026-09-17",
    day: "الخميس",
    station: "صلالة",
    legs: [
      { from: SEEB, checkIn: "09:00", depart: "12:00" },
      { from: "صلالة", checkIn: "11:00", depart: "14:30" },
    ],
  },
];

/**
 * التنبيه إعلانًا.
 *
 * من يفتح «الرحلات» يرى التنبيه — ومن لا يفتحها لا يعلم. والرسالة تصل مساء
 * الأربعاء لمن يسافر صباح الخميس، فلا تُترك في شاشةٍ قد لا تُفتح: تُشتقّ منها
 * إعلانٌ يظهر في الرئيسية وفي «الإعلانات» بلا أن يُكتب مرّتين ولا أن يُنسى
 * حذفه — نافذةُ ظهوره تنتهي بانتهاء يومه بتوقيت عُمان.
 *
 * ولها معرّفٌ ثابت مشتقٌّ من تاريخها ومحطّتها لا رقمٌ عشوائي: القوائم تُرسم
 * بالمفاتيح، ومفتاحٌ يتغيّر كل رسمة يُعيد بناء البطاقة بلا داعٍ.
 */
export function noticeAnnouncements(): Announcement[] {
  return FLIGHT_NOTICES.map((notice) => {
    const legs = notice.legs
      .map((leg) => `من ${leg.from}: التسجيل ${leg.checkIn} — الإقلاع ${leg.depart}.`)
      .join("\n");
    return {
      id: `flight-notice-${notice.date}-${notice.station}`,
      title: `تغيير توقيت رحلة ${notice.station} — ${notice.day}`,
      description: `${legs}\nيُعمل بهذا التوقيت لهذا اليوم فقط، ثم يعود الجدول المعتاد.`,
      type: "تنبيه" as const,
      publishedAt: notice.date,
      // ينتهي بانتهاء يومه: منتصف ليل اليوم التالي بتوقيت عُمان.
      endsAt: `${nextDayIso(notice.date)}T00:00:00+04:00`,
    };
  });
}

function nextDayIso(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  // الظهيرة لا منتصف الليل: الإضافة من منتصف الليل تنزلق يومًا في المناطق
  // التي يتغيّر فيها التوقيت الصيفي.
  const date = new Date(year, month - 1, day, 12);
  date.setDate(date.getDate() + 1);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
