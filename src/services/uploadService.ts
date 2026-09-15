import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import type { MediaAttachment, MediaKind } from "@/types/models";
import { USE_MOCK_DATA } from "./config";
import { supabase } from "./supabase";
// المنطق الخالص في utils/media ليُختبر خارج الهاتف؛ ويُعاد تصديره هنا ليبقى
// مسار الاستيراد في الشاشات كما هو.
import {
  assertWithinLimit,
  base64ToBytes,
  bytesOfBase64,
  extensionOf,
  kindOfMime,
  MEDIA_KIND_LABEL,
  MEDIA_LIMITS,
  formatBytes,
  formatDuration,
} from "@/utils/media";

/** حاوية أغلفة الأنشطة والإعلانات — القراءة للجميع والكتابة للإدارة فقط. */
export const IMAGE_BUCKET = "activity-images";

/** حاوية المرفقات (صور، فيديو، صوت، ملفات) — يكتب فيها المستخدم المسجَّل. */
export const MEDIA_BUCKET = "app-media";

export type { MediaAttachment, MediaKind };


export { MEDIA_KIND_LABEL, MEDIA_LIMITS, formatBytes, formatDuration };
export type { MediaLimit } from "@/utils/media";

/** ملف مختار أو مسجَّل، قبل الرفع. */
export interface PickedMedia {
  kind: MediaKind;
  uri: string;
  name: string;
  mimeType: string;
  size: number;
  durationMs?: number;
  /** يُملأ حين يعطينا المنتقي base64 مباشرة، وإلا نقرأه عند الرفع. */
  base64?: string;
}

/** توافق مع الشيفرة القائمة: حقل الصورة يستعمل هذا الشكل. */
export interface PickedImage {
  uri: string;
  base64: string;
  width: number;
  height: number;
}

/* ============ الاختيار من الجهاز ============ */

async function requireLibraryPermission() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("لم يُسمح بالوصول إلى الصور. فعّل الإذن من إعدادات الهاتف.");
  }
}

/**
 * يفتح معرض الصور بعد طلب الإذن. يُرجع `null` إذا ألغى المستخدم الاختيار —
 * وهذا ليس خطأ، فلا يُرمى استثناء. رفض الإذن يُرمى كخطأ ليظهر للمستخدم.
 */
export async function pickImage(): Promise<PickedImage | null> {
  await requireLibraryPermission();

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [16, 10],
    quality: 0.7,
    base64: true,
  });

  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.base64) {
    throw new Error("تعذّرت قراءة الصورة، جرّب صورة أخرى.");
  }

  assertWithinLimit("image", bytesOfBase64(asset.base64));
  return { uri: asset.uri, base64: asset.base64, width: asset.width, height: asset.height };
}

/** يلتقط صورة بالكاميرا مباشرة بدل اختيارها من المعرض. */
export async function captureImage(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error("لم يُسمح باستخدام الكاميرا. فعّل الإذن من إعدادات الهاتف.");
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
    base64: true,
  });

  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.base64) throw new Error("تعذّرت قراءة الصورة، حاول مرة أخرى.");

  assertWithinLimit("image", bytesOfBase64(asset.base64));
  return { uri: asset.uri, base64: asset.base64, width: asset.width, height: asset.height };
}

/** يحوّل صورة مختارة إلى الشكل الموحّد للمرفقات. */
export function imageToMedia(image: PickedImage): PickedMedia {
  return {
    kind: "image",
    uri: image.uri,
    name: `صورة.jpg`,
    mimeType: "image/jpeg",
    size: bytesOfBase64(image.base64),
    base64: image.base64,
  };
}

/** يفتح المعرض لاختيار مقطع فيديو، مع سقف مدة دقيقة واحدة. */
export async function pickVideo(maxSeconds = 60): Promise<PickedMedia | null> {
  await requireLibraryPermission();

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    allowsEditing: true,
    videoMaxDuration: maxSeconds,
    quality: 0.6,
  });

  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.uri) throw new Error("تعذّرت قراءة المقطع، جرّب مقطعًا آخر.");

  const size = asset.fileSize ?? (await fileSize(asset.uri));
  assertWithinLimit("video", size);
  if (asset.duration && asset.duration > (maxSeconds + 2) * 1000) {
    throw new Error(`مدة المقطع أطول من اللازم. اختر مقطعًا لا يتجاوز ${maxSeconds} ثانية.`);
  }

  return {
    kind: "video",
    uri: asset.uri,
    name: asset.fileName ?? "مقطع.mp4",
    mimeType: asset.mimeType ?? "video/mp4",
    size,
    durationMs: asset.duration ?? undefined,
  };
}

/** يصوّر مقطع فيديو بالكاميرا مباشرة. */
export async function captureVideo(maxSeconds = 60): Promise<PickedMedia | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error("لم يُسمح باستخدام الكاميرا. فعّل الإذن من إعدادات الهاتف.");
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    videoMaxDuration: maxSeconds,
    quality: 0.6,
  });

  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.uri) throw new Error("تعذّر تسجيل المقطع، حاول مرة أخرى.");

  const size = asset.fileSize ?? (await fileSize(asset.uri));
  assertWithinLimit("video", size);

  return {
    kind: "video",
    uri: asset.uri,
    name: asset.fileName ?? "مقطع.mp4",
    mimeType: asset.mimeType ?? "video/mp4",
    size,
    durationMs: asset.duration ?? undefined,
  };
}

/** أنواع الملفات المسموح إرفاقها — مستندات وصور فقط، بلا ملفات تنفيذية. */
const FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/*",
  "text/plain",
];

/** يفتح متصفح الملفات لإرفاق مستند. */
export async function pickFile(): Promise<PickedMedia | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: FILE_TYPES,
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset?.uri) throw new Error("تعذّرت قراءة الملف، جرّب ملفًا آخر.");

  const mimeType = asset.mimeType ?? "application/octet-stream";
  // النوع أولًا ثم الحدّ: كان يُفحص بحدّ الملفّات (١٠ ميجا) ثم يُرجَع كصورة
  // (حدّها ٣) — فتُقبل عند الاختيار ويرفضها الرفعُ بعد حين، والمستخدم يظنّ
  // العطل في الشبكة لا في حجم ما اختاره.
  const kind = kindOfMime(mimeType);
  const size = asset.size ?? (await fileSize(asset.uri));
  assertWithinLimit(kind, size);

  return {
    kind,
    uri: asset.uri,
    name: asset.name ?? "ملف",
    mimeType,
    size,
  };
}

/** يبني مرفقًا صوتيًا من تسجيل انتهى للتو. */
export function recordingToMedia(uri: string, durationMs: number): PickedMedia {
  return {
    kind: "audio",
    uri,
    name: `تسجيل-${formatDuration(durationMs).replace(":", "-")}.m4a`,
    mimeType: "audio/m4a",
    size: 0,
    durationMs,
  };
}

/* ============ الرفع ============ */

async function fileSize(uri: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(uri, { size: true });
    return info.exists && "size" in info ? (info.size ?? 0) : 0;
  } catch {
    return 0;
  }
}

async function readBase64(media: PickedMedia): Promise<string> {
  if (media.base64) return media.base64;
  return FileSystem.readAsStringAsync(media.uri, { encoding: FileSystem.EncodingType.Base64 });
}

/**
 * يرفع الصورة إلى حاوية الأغلفة ويُرجع رابطها.
 *
 * في وضع البيانات التجريبية لا يوجد خادم، فنُرجع مسار الصورة المحلي —
 * فتظهر في الواجهة تمامًا كما ستظهر لاحقًا، دون أي تغيير في الشاشات.
 */
export async function uploadImage(image: PickedImage, folder: string): Promise<string> {
  if (USE_MOCK_DATA) {
    return image.uri;
  }

  const name = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(name, base64ToBytes(image.base64), { contentType: "image/jpeg", upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(name);
  return data.publicUrl;
}

/**
 * يرفع أي مرفق (صورة، فيديو، صوت، ملف) إلى حاوية المرفقات ويُرجع وصفه كاملًا.
 * في الوضع التجريبي يُرجع المسار المحلي، فتعمل المعاينة والتشغيل كما هي.
 */
export async function uploadMedia(media: PickedMedia, folder: string): Promise<MediaAttachment> {
  const size = media.size || (await fileSize(media.uri));
  assertWithinLimit(media.kind, size);

  const attachment: MediaAttachment = {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: media.kind,
    url: media.uri,
    name: media.name,
    mimeType: media.mimeType,
    size,
    durationMs: media.durationMs,
  };

  if (USE_MOCK_DATA) {
    return attachment;
  }

  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensionOf(media)}`;
  const bytes = base64ToBytes(await readBase64(media));
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, bytes, { contentType: media.mimeType, upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { ...attachment, url: data.publicUrl };
}

/** يحذف صورة مرفوعة. يتجاهل الروابط المحلية لأنها ليست على الخادم. */
export async function deleteImage(url: string): Promise<void> {
  if (USE_MOCK_DATA || !url.includes(`/${IMAGE_BUCKET}/`)) return;
  const path = url.split(`/${IMAGE_BUCKET}/`)[1];
  if (!path) return;
  await supabase.storage.from(IMAGE_BUCKET).remove([path]);
}

/** يحذف مرفقًا مرفوعًا. */
export async function deleteMedia(attachment: MediaAttachment): Promise<void> {
  if (USE_MOCK_DATA || !attachment.url.includes(`/${MEDIA_BUCKET}/`)) return;
  const path = attachment.url.split(`/${MEDIA_BUCKET}/`)[1];
  if (!path) return;
  await supabase.storage.from(MEDIA_BUCKET).remove([path]);
}
