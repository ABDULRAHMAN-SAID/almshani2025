import type { Ionicons } from "@expo/vector-icons";

/**
 * الطقس: الرموز والتحويل من ردّ المزوّد إلى ما تعرضه الشاشة.
 *
 * كلّ ما في هذا الملفّ دوالّ خالصة: تأخذ ردًّا وتُرجع نموذجًا. ولا شبكة فيه
 * ولا حالة — ليُختبر بلا خادم ولا هاتف، وهو ما يجعل «هل تُقرأ الساعة الصحيحة؟
 * هل يُختار اليوم الصحيح؟» سؤالًا يُجاب باختبار لا بتجربة على الشاشة.
 */

type IoniconName = keyof typeof Ionicons.glyphMap;

export interface WeatherLook {
  label: string;
  icon: IoniconName;
  tint: string;
}

/**
 * رموز WMO — وهي ما يردّه المزوّد رقمًا لا نصًّا.
 *
 * والترجمة هنا لا في الشاشة: النصّ العربي يجب أن يكون واحدًا في البطاقة
 * والشريط والصفحة، وإلا قالت الرئيسية «غائم» وقالت التفاصيل «سحب متفرّقة»
 * عن الساعة نفسها.
 */
const CODES: Record<number, WeatherLook> = {
  0: { label: "صحو", icon: "sunny-outline", tint: "#C7A252" },
  1: { label: "صحو غالبًا", icon: "partly-sunny-outline", tint: "#C7A252" },
  2: { label: "غائم جزئيًّا", icon: "partly-sunny-outline", tint: "#8A93A5" },
  3: { label: "غائم", icon: "cloud-outline", tint: "#6B7686" },
  45: { label: "ضباب", icon: "cloudy-outline", tint: "#8A93A5" },
  48: { label: "ضباب متجمّد", icon: "cloudy-outline", tint: "#8A93A5" },
  51: { label: "رذاذ خفيف", icon: "rainy-outline", tint: "#2C7A7B" },
  53: { label: "رذاذ", icon: "rainy-outline", tint: "#2C7A7B" },
  55: { label: "رذاذ كثيف", icon: "rainy-outline", tint: "#2C7A7B" },
  56: { label: "رذاذ متجمّد", icon: "rainy-outline", tint: "#2C7A7B" },
  57: { label: "رذاذ متجمّد كثيف", icon: "rainy-outline", tint: "#2C7A7B" },
  61: { label: "مطر خفيف", icon: "rainy-outline", tint: "#2C5282" },
  63: { label: "مطر", icon: "rainy-outline", tint: "#2C5282" },
  65: { label: "مطر غزير", icon: "rainy-outline", tint: "#2C5282" },
  66: { label: "مطر متجمّد", icon: "rainy-outline", tint: "#2C5282" },
  67: { label: "مطر متجمّد غزير", icon: "rainy-outline", tint: "#2C5282" },
  71: { label: "ثلج خفيف", icon: "snow-outline", tint: "#5A7CA6" },
  73: { label: "ثلج", icon: "snow-outline", tint: "#5A7CA6" },
  75: { label: "ثلج كثيف", icon: "snow-outline", tint: "#5A7CA6" },
  77: { label: "حبّات ثلج", icon: "snow-outline", tint: "#5A7CA6" },
  80: { label: "زخّات خفيفة", icon: "rainy-outline", tint: "#2C5282" },
  81: { label: "زخّات مطر", icon: "rainy-outline", tint: "#2C5282" },
  82: { label: "زخّات غزيرة", icon: "rainy-outline", tint: "#1A4480" },
  85: { label: "زخّات ثلج", icon: "snow-outline", tint: "#5A7CA6" },
  86: { label: "زخّات ثلج كثيفة", icon: "snow-outline", tint: "#5A7CA6" },
  95: { label: "عاصفة رعدية", icon: "thunderstorm-outline", tint: "#434190" },
  96: { label: "عاصفة رعدية ببَرَد", icon: "thunderstorm-outline", tint: "#434190" },
  99: { label: "عاصفة رعدية ببَرَد شديد", icon: "thunderstorm-outline", tint: "#434190" },
};

const UNKNOWN: WeatherLook = { label: "—", icon: "cloud-outline", tint: "#6B7686" };

/**
 * وصف الحالة. وفي الليل تتبدّل الأيقونة لا العبارة: «صحو» ليلًا شمسٌ في
 * الشاشة لو تُركت، وهي كذبة صغيرة تُفسد الثقة بالباقي.
 */
export function describeWeather(code: number, isNight = false): WeatherLook {
  const look = CODES[code] ?? UNKNOWN;
  if (!isNight) return look;
  if (look.icon === "sunny-outline") return { ...look, icon: "moon-outline", tint: "#5A7CA6" };
  if (look.icon === "partly-sunny-outline") return { ...look, icon: "cloudy-night-outline", tint: "#5A7CA6" };
  return look;
}

/* ------------------------------ الأرقام ------------------------------ */

const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/**
 * أرقام عربية-هندية، كما تكتبها بقية الشاشات (الساعة والتاريخ الهجري).
 *
 * ولا تُترك لـ toLocaleString: محرّك الهاتف قد يُبنى بلا بيانات اللغات
 * الكاملة، فيُرجع الأرقام اللاتينية بلا خطأ — فتظهر شاشة نصفها عربي ونصفها
 * لاتيني بلا أن يُنبّه أحد.
 */
export function arabicNumber(value: number | string): string {
  return String(value).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]);
}

/** درجة حرارة مقرّبة بالأرقام العربية ومعها الرمز: ٣٠° */
export function tempLabel(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${arabicNumber(Math.round(value))}°`;
}

/* ------------------------------ النموذج ------------------------------ */

export interface HourPoint {
  /** وقت محلّي بصيغة ISO كما يردّه المزوّد: 2026-09-16T14:00 */
  time: string;
  /** ساعة اليوم 0–23، مقروءة من النصّ لا من Date — انظر التعليق أدناه. */
  hour: number;
  temperature: number;
  code: number;
  precipitation: number;
  isNight: boolean;
}

export interface DayPoint {
  date: string;
  max: number;
  min: number;
  code: number;
  precipitation: number;
}

export interface Forecast {
  latitude: number;
  longitude: number;
  temperature: number;
  apparent: number;
  humidity: number;
  windSpeed: number;
  code: number;
  isNight: boolean;
  todayMax: number;
  todayMin: number;
  sunrise: string;
  sunset: string;
  /** الوقت المحلّي للمكان وقت القياس، كما ردّه المزوّد. */
  observedAt: string;
  hours: HourPoint[];
  days: DayPoint[];
}

/**
 * ساعة النصّ ودقيقته، مقروءتان من الحروف.
 *
 * ولا تُمرَّر على Date: المزوّد يردّ وقتًا محلّيًّا للمكان بلا منطقة —
 * «2026-09-16T14:00» — و‏new Date() تقرؤه بتوقيت الجهاز. فمن كان هاتفه على
 * توقيت آخر رأى ساعات الطقس مزاحةً ساعاتٍ عن الحقيقة، وهو خطأ لا يُرى في
 * الاختبار إلا إن جُرّب بمنطقة أخرى — وقد جُرّب.
 */
export function readClock(iso: string): { hour: number; minute: number } {
  const match = /T(\d{2}):(\d{2})/.exec(iso ?? "");
  if (!match) return { hour: 0, minute: 0 };
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

/** هل هذا الوقت بين الغروب والشروق؟ يقارن نصًّا بنصّ، لنفس السبب أعلاه. */
export function isNightAt(iso: string, sunrise: string, sunset: string): boolean {
  const t = readClock(iso);
  const up = readClock(sunrise);
  const down = readClock(sunset);
  const minutes = t.hour * 60 + t.minute;
  return minutes < up.hour * 60 + up.minute || minutes >= down.hour * 60 + down.minute;
}

/** ساعة بصيغة «٤ م» كما في تطبيقات الطقس. */
export function hourLabel(hour: number): string {
  if (hour === 0) return "١٢ ص";
  if (hour === 12) return "١٢ م";
  const half = hour > 12 ? hour - 12 : hour;
  return `${arabicNumber(half)} ${hour >= 12 ? "م" : "ص"}`;
}

/* ------------------------------ التحليل ------------------------------ */

interface RawForecast {
  latitude?: number;
  longitude?: number;
  current?: Record<string, unknown>;
  hourly?: Record<string, unknown>;
  daily?: Record<string, unknown>;
}

const num = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/**
 * من ردّ المزوّد إلى النموذج.
 *
 * والدالة لا تفترض اكتمال الردّ: مزوّد الطقس خدمة مجانية، وقد يسقط منها حقل
 * أو تُغيَّر صيغته، وشاشةٌ تنهار لأن حقل «الرطوبة» غاب أسوأ من شاشة تقول
 * «—» مكانه. فكلّ حقل يُقرأ بحارسه، والناقص يصير صفرًا أو شرطة.
 */
export function parseForecast(raw: RawForecast): Forecast {
  const current = raw.current ?? {};
  const hourly = raw.hourly ?? {};
  const daily = raw.daily ?? {};

  const sunrise = String(list(daily.sunrise)[0] ?? "");
  const sunset = String(list(daily.sunset)[0] ?? "");
  const observedAt = String(current.time ?? "");

  const times = list(hourly.time).map(String);
  const temps = list(hourly.temperature_2m);
  const codes = list(hourly.weather_code);
  const rains = list(hourly.precipitation_probability);

  const hours: HourPoint[] = times.map((time, index) => ({
    time,
    hour: readClock(time).hour,
    temperature: num(temps[index]),
    code: num(codes[index]),
    precipitation: num(rains[index]),
    isNight: isNightAt(time, sunrise, sunset),
  }));

  const dayDates = list(daily.time).map(String);
  const dayMax = list(daily.temperature_2m_max);
  const dayMin = list(daily.temperature_2m_min);
  const dayCode = list(daily.weather_code);
  const dayRain = list(daily.precipitation_probability_max);

  const days: DayPoint[] = dayDates.map((date, index) => ({
    date,
    max: num(dayMax[index]),
    min: num(dayMin[index]),
    code: num(dayCode[index]),
    precipitation: num(dayRain[index]),
  }));

  return {
    latitude: num(raw.latitude),
    longitude: num(raw.longitude),
    temperature: num(current.temperature_2m),
    apparent: num(current.apparent_temperature),
    humidity: num(current.relative_humidity_2m),
    windSpeed: num(current.wind_speed_10m),
    code: num(current.weather_code),
    isNight: isNightAt(observedAt, sunrise, sunset),
    todayMax: days[0]?.max ?? num(current.temperature_2m),
    todayMin: days[0]?.min ?? num(current.temperature_2m),
    sunrise,
    sunset,
    observedAt,
    hours,
    days,
  };
}

/**
 * الساعات القادمة ابتداءً من الساعة الحالية للمكان.
 *
 * والبداية من ساعة القياس لا من أوّل المصفوفة: المزوّد يردّ اليوم كلّه من
 * منتصف ليله، فلو عُرض أوّله لرأى من يفتح التطبيق ظهرًا ساعاتٍ مضت.
 */
export function nextHours(forecast: Forecast, count = 12): HourPoint[] {
  const now = forecast.observedAt.slice(0, 13); // «2026-09-16T14»
  const start = forecast.hours.findIndex((point) => point.time.slice(0, 13) >= now);
  const from = start < 0 ? 0 : start;
  return forecast.hours.slice(from, from + count);
}

/** أيام قادمة بلا اليوم الحالي — اليوم معروض كاملًا في الأعلى. */
export function comingDays(forecast: Forecast, count = 5): DayPoint[] {
  return forecast.days.slice(1, 1 + count);
}
