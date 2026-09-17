/** أرقامٌ عربية وأسعارٌ بالريال — تُكتب مرّةً وتُستعمل في القالب والمحرّر. */

const ARABIC = "٠١٢٣٤٥٦٧٨٩";

export function arabicDigits(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => ARABIC[Number(digit)]);
}

/**
 * سعرٌ بالريال العُماني.
 *
 * والصفر «حسب الطلب» لا «٠ ر.ع.»: الخدمةُ التي يُسأل عن سعرها تُكتب كذلك،
 * وصفرٌ مكتوب يُقرأ مجّانًا فيُحرج صاحبه.
 */
export function omr(price: number): string {
  if (price <= 0) return "حسب الطلب";
  const fixed = Number.isInteger(price) ? String(price) : price.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  return `${arabicDigits(fixed)} ر.ع.`;
}

/** أوّل حرفين من الاسم — شعارٌ مؤقّت حتى يرفع صاحبه شعاره. */
export function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter((word) => !["مطعم", "صالون", "عيادة", "مكتب", "ورشة", "بيت"].includes(word));
  const source = words.length > 0 ? words : name.trim().split(/\s+/);
  return source.slice(0, 2).map((word) => word[0]).join("");
}

/** رابط واتساب مباشر برسالةٍ جاهزة. */
export function whatsappLink(number: string, business: string): string {
  const text = encodeURIComponent(`السلام عليكم، أودّ الاستفسار عن ${business}`);
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${text}`;
}
