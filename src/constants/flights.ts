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
  /** الوجهة التي تُنسب إليها الرحلة في الورقة. */
  station: string;
  day: FlightDay;
  /** الطائرة ورقمها كما في الورقة. */
  aircraft: string;
  stops: FlightStop[];
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

/** ما كُتب أسفل الورقة عن المحطّتين اللتين لا جدول ثابت لهما. */
export const FLIGHT_NOTES: { place: string; note: string }[] = [
  { place: "المزيونة", note: "رحلة واحدة (CASA) كل أسبوعين" },
  { place: "الحلانيات", note: "CASA أو NH-90 كل ثلاثاء" },
];

export const FLIGHT_EFFECTIVE = "ساري من ١٩ سبتمبر ٢٠٢٦ حتى إشعار آخر";
export const FLIGHT_SOURCE = "جدول رحلات سلاح الجو السلطاني العماني — من السيب والمصنعة";
