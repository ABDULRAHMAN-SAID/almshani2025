import { parseForecast, type Forecast } from "@/utils/weather";

/**
 * الطقس من Open-Meteo.
 *
 * ولماذا هذا المزوّد؟ لأنه بلا مفتاح. وكلّ مزوّد يطلب مفتاحًا يعني سرًّا
 * يُحقن في البناء ويُسرَّب مع الملفّ — والمفتاح المجاني محدود بعدد طلبات،
 * فيوم يكثر المستخدمون يقف الطقس عند الجميع دفعةً واحدة بلا سبب ظاهر.
 * وهذا يعمل بلا حساب ولا مفتاح ولا سقف يخصّنا.
 *
 * وما يُرسَل إليه: إحداثيّتك وحدها — لا اسمك ولا هاتفك ولا معرّف جهازك.
 * والاسم الذي يظهر فوق الطقس يُحسب داخل التطبيق من جدول مدن مكتوب فيه، فلا
 * تُرسل إحداثيّتك إلى خدمة تسمية ثانية.
 */
const ENDPOINT = "https://api.open-meteo.com/v1/forecast";

const FIELDS = [
  "current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
  "hourly=temperature_2m,weather_code,precipitation_probability",
  "daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
  // ‏auto: الأوقات تعود بتوقيت المكان نفسه لا بتوقيت عالمي. ومن يفتح التطبيق
  // في صلالة يجب أن يرى ساعات صلالة، لا ساعاتٍ تُزاح أربعًا.
  "timezone=auto",
  "forecast_days=6",
].join("&");

/** يُستبدل في الاختبار بخادم محلّي — انظر scripts/test-weather.mjs. */
export const WEATHER_ENDPOINT =
  process.env.EXPO_PUBLIC_WEATHER_ENDPOINT?.trim() || ENDPOINT;

export async function fetchForecast(lat: number, lon: number): Promise<Forecast> {
  const url = `${WEATHER_ENDPOINT}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&${FIELDS}`;

  // مهلة صريحة: شبكة القاعدة قد تقبل الاتصال ولا تردّ، فيبقى الدوران إلى
  // ما لا نهاية وتظل الشاشة تنتظر بلا أن تقول شيئًا. عشر ثوانٍ ثم خطأ مفهوم.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`تعذّر جلب الطقس (${response.status})`);
    }
    const raw = (await response.json()) as Record<string, unknown>;
    return parseForecast(raw);
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") {
      throw new Error("تأخّر ردّ خدمة الطقس. تحقّق من الاتصال ثم أعد المحاولة.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
