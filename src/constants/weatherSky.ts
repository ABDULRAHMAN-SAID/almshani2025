/**
 * لون السماء خلف الطقس.
 *
 * شاشةٌ بيضاء تعرض «٣٠°» تقول الرقم ولا تقول شيئًا عن الجوّ. وتطبيقات الطقس
 * كلّها تفعل هذا لسبب: اللون هو أول ما يُقرأ — قبل الرقم وقبل الكلمة — فيعرف
 * من فتح الشاشة أنّ الدنيا صحوٌ أو مطرٌ أو ليل بلمحة.
 *
 * والتدرّج يُختار من حالة الطقس ومن الليل والنهار معًا: صحوُ الظهيرة ليس
 * كصحو الليل، والغائم بينهما.
 */
export interface Sky {
  /** لونان للتدرّج، من الأعلى إلى الأسفل. */
  colors: [string, string];
  /** لون النصّ الثانوي فوق هذا التدرّج. */
  muted: string;
}

const NIGHT: Sky = { colors: ["#0B1F3A", "#132F4F"], muted: "rgba(255,255,255,0.66)" };
const CLEAR: Sky = { colors: ["#2E77BE", "#1B4C7D"], muted: "rgba(255,255,255,0.74)" };
const HAZE: Sky = { colors: ["#4B6E93", "#2B4A6B"], muted: "rgba(255,255,255,0.72)" };
const CLOUD: Sky = { colors: ["#5A7690", "#33506C"], muted: "rgba(255,255,255,0.72)" };
const RAIN: Sky = { colors: ["#2F5C7E", "#1B3A55"], muted: "rgba(255,255,255,0.7)" };
const STORM: Sky = { colors: ["#3A3E6E", "#1E2044"], muted: "rgba(255,255,255,0.7)" };

/** من رمز WMO إلى لون السماء. */
export function skyFor(code: number, isNight: boolean): Sky {
  if (isNight) return NIGHT;
  if (code >= 95) return STORM;
  if (code >= 51 || (code >= 80 && code <= 86)) return RAIN;
  if (code === 45 || code === 48) return HAZE;
  if (code === 3) return CLOUD;
  if (code === 1 || code === 2) return { colors: ["#3D82C4", "#1F5285"], muted: "rgba(255,255,255,0.74)" };
  return CLEAR;
}
