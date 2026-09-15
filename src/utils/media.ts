/**
 * منطق المرفقات الخالص: الحدود، والامتدادات، وفكّ base64، وصياغة الحجم والمدة.
 *
 * مُخرَج من uploadService لأن ذاك يستورد كاميرا الجهاز ونظام ملفّاته، فلا
 * يُحمَّل خارج الهاتف — فبقي هذا المنطق كلّه بلا اختبار واحد بين 212 تحقّقًا،
 * وهو أكثر ما يحتاجه: حدٌّ خاطئ يرفض ملفًا سليمًا، وامتدادٌ خاطئ يرفع مقطعًا
 * لا يُشغَّل، ولا يظهر أيّهما إلا على جهاز حقيقي بيد صاحبه.
 */

import type { MediaKind } from "@/types/models";

export interface MediaLimit {
  bytes: number;
  label: string;
}

export const MEDIA_LIMITS: Record<MediaKind, MediaLimit> = {
  image: { bytes: 3 * 1024 * 1024, label: "٣ ميجابايت" },
  video: { bytes: 25 * 1024 * 1024, label: "٢٥ ميجابايت" },
  audio: { bytes: 8 * 1024 * 1024, label: "٨ ميجابايت" },
  file: { bytes: 10 * 1024 * 1024, label: "١٠ ميجابايت" },
};

export const MEDIA_KIND_LABEL: Record<MediaKind, string> = {
  image: "صورة",
  video: "فيديو",
  audio: "مقطع صوتي",
  file: "ملف",
};

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "audio/m4a": "m4a",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/aac": "aac",
  "application/pdf": "pdf",
};

/** نوع المرفق من نوعه الصِّرف: صورة اختيرت من متصفّح الملفات تبقى صورة. */
export const kindOfMime = (mimeType: string): MediaKind =>
  mimeType.startsWith("image/") ? "image" : "file";

export function extensionOf(media: { mimeType: string; name: string }): string {
  const fromMime = EXTENSIONS[media.mimeType];
  if (fromMime) return fromMime;
  const fromName = media.name.includes(".") ? media.name.split(".").pop() : "";
  return (fromName || "bin").toLowerCase().slice(0, 5);
}

export function assertWithinLimit(kind: MediaKind, size: number) {
  const limit = MEDIA_LIMITS[kind];
  if (size > limit.bytes) {
    throw new Error(`حجم الملف كبير. الحد الأقصى لـ${MEDIA_KIND_LABEL[kind]} هو ${limit.label}.`);
  }
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * فكّ ترميز base64 إلى بايتات. مكتوب هنا بدل إضافة اعتمادية، ولأن `atob`
 * غير مضمونة في React Native.
 */
export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, "");
  const length = Math.floor((clean.length * 3) / 4);
  const bytes = new Uint8Array(length);
  let byte = 0;
  let bits = 0;
  let out = 0;

  for (let i = 0; i < clean.length; i += 1) {
    const value = B64.indexOf(clean[i]);
    if (value < 0) continue;
    byte = (byte << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[out] = (byte >> bits) & 0xff;
      out += 1;
    }
  }
  return bytes.subarray(0, out);
}

/** الحجم التقريبي بالبايت من طول سلسلة base64. */
export const bytesOfBase64 = (base64: string) => Math.floor((base64.length * 3) / 4);

/** يحوّل البايتات إلى نص عربي مقروء: ٤٢٠ كيلوبايت / ١٫٨ ميجابايت. */
export function formatBytes(size?: number): string {
  if (!size || size <= 0) return "";
  const kb = size / 1024;
  if (kb < 1024) return `${Math.round(kb)} كيلوبايت`;
  return `${(kb / 1024).toFixed(1).replace(".", "٫")} ميجابايت`;
}

export function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) return "0:00";
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
