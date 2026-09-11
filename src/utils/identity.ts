/**
 * هويّة الحساب: الرقم والبريد.
 *
 * منطق خالص بلا أي تبعية، ليكون قابلًا للاختبار وحده. وهو الموضع الوحيد الذي
 * تُوحَّد فيه صيغة الرقم: الخادم يطابقه حرفًا بحرف، فلو وحّدناه في مكانين
 * واختلفا لصار الرقم الواحد حسابين.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_DIGITS = /^\+?\d{8,15}$/;

export const looksLikeEmail = (value: string) => EMAIL_REGEX.test(value.trim());

/** يحوّل الرقم إلى الصيغة الدولية: 91234567 ← ‎+96891234567 */
export function normalizePhone(raw: string): string {
  const value = raw.replace(/[\s-]/g, "");
  if (value.startsWith("+")) return value;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 8) return `+968${digits}`; // رقم عماني محلي
  return `+${digits}`;
}

export const isValidPhone = (value: string) => PHONE_DIGITS.test(normalizePhone(value));
