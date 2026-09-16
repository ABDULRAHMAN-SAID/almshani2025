/* eslint-disable @typescript-eslint/no-var-requires */
import type * as LocationModule from "expo-location";

/**
 * موقع الجهاز.
 *
 * والغرض منه واحد: أن يتبع الطقسُ صاحبَه حين ينتقل — من صلالة إلى ثمريت إلى
 * مصيرة — بلا أن يختار مدينةً كل مرّة.
 *
 * وما لا يفعله هذا الملفّ، عمدًا:
 * - لا يتعقّب في الخلفية. الموقع يُقرأ حين تُفتح شاشة الطقس ولا يُقرأ بعدها.
 *   والتعقّب في الخلفية يستهلك البطارية، ويحتاج إذنًا أشدّ، ويجعل التطبيق
 *   يعرف أين صاحبه وهو مغلق — وليس لنا حاجة بذلك في تطبيق أنشطة.
 * - لا يرسل الموقع إلى خادم المشروع ولا يحفظه فيه. الإحداثيّة تذهب إلى خدمة
 *   الطقس وحدها ثم تُنسى.
 */

/**
 * الوحدة تُحمَّل عند الحاجة لا عند الإقلاع.
 *
 * والسبب ليس الأداء: تحديد الموقع وحدةٌ أصليّة داخل ملفّ التطبيق، والتحديث
 * الهوائي يستبدل الشفرة ولا يستبدل الملفّ. فلو استُورد أعلى الملفّ لسقط كل
 * هاتف عليه النسخة القديمة عند أوّل تحديث — لا شاشة طقس تُعطب، بل التطبيق
 * كلّه ينهار عند الإقلاع. وهكذا: من عنده النسخة الجديدة يعمل عنده الموقع،
 * ومن لم يحدّث يرى رسالةً تقول له أن يحدّث، ويبقى له اختيار المكان بيده.
 */
let cached: typeof LocationModule | null | undefined;

function loadLocation(): typeof LocationModule | null {
  if (cached !== undefined) return cached;
  try {
    cached = require("expo-location") as typeof LocationModule;
  } catch {
    cached = null;
  }
  return cached;
}

export interface Coords {
  lat: number;
  lon: number;
}

export type LocationOutcome =
  | { status: "ok"; coords: Coords }
  | { status: "denied" }
  | { status: "off" }
  /** النسخة المثبّتة أقدم من الميزة: الشفرة وصلت والوحدة الأصليّة لم تصل. */
  | { status: "unavailable" }
  | { status: "error"; message: string };

/**
 * الإذن ثم القراءة.
 *
 * والتفريق بين «مرفوض» و«الخدمة مطفأة» ليس ترفًا: الأول يُعالج من إعدادات
 * التطبيق، والثاني بسحب شريط الإشعارات وتشغيل الموقع. ورسالةٌ واحدة لهما
 * تُرسل نصف الناس إلى المكان الخطأ.
 */
export async function currentCoords(): Promise<LocationOutcome> {
  const Location = loadLocation();
  if (!Location) return { status: "unavailable" };
  try {
    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) return { status: "off" };

    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") return { status: "denied" };

    // ‏Balanced لا Highest: نريد المدينة لا الشارع. والدقّة العالية تُشغّل
    // ‏GPS الأقمار فتستغرق ثوانيَ طويلة داخل المباني وقد لا تعود بشيء.
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      status: "ok",
      coords: { lat: position.coords.latitude, lon: position.coords.longitude },
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "تعذّر تحديد الموقع",
    };
  }
}

/**
 * آخر موقع عرفه النظام — يعود فورًا بلا انتظار قراءة جديدة.
 *
 * يُستعمل لعرض شيءٍ صحيح في اللحظة الأولى بينما تُقرأ الإحداثيّة الدقيقة،
 * فلا تبدأ الشاشة فارغة عند كل فتح.
 */
export async function lastKnownCoords(): Promise<Coords | null> {
  const Location = loadLocation();
  if (!Location) return null;
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== "granted") return null;
    const position = await Location.getLastKnownPositionAsync({ maxAge: 30 * 60_000 });
    if (!position) return null;
    return { lat: position.coords.latitude, lon: position.coords.longitude };
  } catch {
    return null;
  }
}

/** هل تحرّك صاحب الجهاز بما يكفي لإعادة السؤال عن الطقس؟ */
export function movedEnough(a: Coords | null, b: Coords | null, km = 5): boolean {
  if (!a || !b) return true;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h))) >= km;
}
