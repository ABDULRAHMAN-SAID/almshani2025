import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import type { MediaAttachment, MediaKind } from "@/types/models";
import { SUPABASE_ANON_KEY, SUPABASE_URL, USE_MOCK_DATA } from "./config";
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

  // بلا خطوة قصّ.
  //
  // كانت allowsEditing تفتح شاشة القصّ التي يبنيها النظام، وهي على كثير من
  // هواتف أندرويد لا تحمل زرًّا مكتوبًا عليه «تم» — بل أيقونة قصّ وحدها.
  // فمن اختار صورةً وقف أمام شاشةٍ لا يعرف كيف يخرج منها بالصورة، ولا شيء
  // في التطبيق يدلّه. والبطاقات تقصّ ما يزيد عندها بنفسها (resizeMode)، فلم
  // يكن القصّ اليدوي يشتري شيئًا أصلًا.
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
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

  // وبلا قصّ هنا أيضًا، للسبب نفسه: شاشة تشذيب المقطع في أندرويد أغمض من
  // شاشة قصّ الصورة، والمدّة محدودة أصلًا ويُرفض ما تجاوزها برسالة واضحة.
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    allowsEditing: false,
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
  await putObject(MEDIA_BUCKET, path, media);
  await discardTemporary(media.uri);

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { ...attachment, url: data.publicUrl };
}

/**
 * يحذف النسخة المؤقّتة بعد أن تصل الخادم.
 *
 * الكاميرا والمنتقي يكتبان نسخة في ذاكرة التطبيق المؤقّتة قبل الرفع، ولم
 * يكن شيء يحذفها. فكلّ مقطع وكلّ صورة تبقى مرّتين: على الخادم وعلى الهاتف.
 * ومع الاستعمال يكبر حجم التطبيق في إعدادات الهاتف بلا سبب يفهمه صاحبه —
 * يرى تطبيق أنشطة وقد صار مئات الميجابايت.
 *
 * ولا نحذف إلا ما في المجلّد المؤقّت: ملفٌّ اختاره المستخدم من مجلّداته قد
 * يُمرَّر بمساره الأصلي، وحذفُه يمحو ملفّه هو.
 */
async function discardTemporary(uri: string): Promise<void> {
  const cache = FileSystem.cacheDirectory;
  if (!cache || !uri.startsWith(cache)) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // تنظيف لا أكثر: فشلُه لا يُبطل رفعًا تمّ.
  }
}

/**
 * يرفع الملفّ من مساره مباشرة، لا من ذاكرة التطبيق.
 *
 * كان المسار الوحيد يقرأ الملفّ كلّه نصَّ base64 ثم يحوّله بايتات: مقطع من
 * خمسة وعشرين ميجابايت يصير نحو ثلاثة وثلاثين نصًّا وخمسة وعشرين بايتات،
 * ستّون ميجابايت في كومة JavaScript دفعة واحدة. على هاتف متوسط هذا بطء
 * شديد، وعلى الأضعف انهيار للتطبيق عند الرفع — وهو أثقل ما يفعله المستخدم
 * وأكثره عرضة للفشل.
 *
 * و‏uploadAsync يمرّر الملفّ من مساره إلى الشبكة في الطبقة الأصلية، فلا يمرّ
 * منه شيء على الذاكرة. ويبقى مسار base64 لمن أعطانا المنتقي محتواه أصلًا
 * (الصور)، ولحالة يتعذّر فيها التدفّق — فالرفع الثقيل أهون من رفع لا يتمّ.
 */
async function putObject(bucket: string, path: string, media: PickedMedia): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (accessToken && SUPABASE_URL && !media.base64) {
    try {
      const result = await FileSystem.uploadAsync(
        `${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURI(path)}`,
        media.uri,
        {
          httpMethod: "POST",
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            apikey: SUPABASE_ANON_KEY,
            "Content-Type": media.mimeType,
            "x-upsert": "false",
          },
        }
      );
      if (result.status >= 200 && result.status < 300) return;
      throw new Error(storageMessage(result.status, result.body));
    } catch (error) {
      // خطأٌ من الخادم نفسه (مساحة ممتلئة، صلاحية) لا يُعالَج بإعادة المحاولة
      // بطريقة أخرى: نرفعه كما هو. أمّا تعذّر التدفّق فنكمل بالمسار القديم.
      if (error instanceof Error && error.message.startsWith("__server__")) {
        throw new Error(error.message.replace("__server__", ""));
      }
    }
  }

  const bytes = base64ToBytes(await readBase64(media));
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, { contentType: media.mimeType, upsert: false });
  if (error) throw error;
}

/** رسائل التخزين إنجليزية؛ وأكثرها ورودًا امتلاء المساحة، فيُقال صراحةً. */
function storageMessage(status: number, body: string): string {
  if (status === 413 || /payload too large|exceeded the maximum/i.test(body)) {
    return "__server__الملفّ أكبر من الحدّ المسموح به. اختر ملفًّا أصغر.";
  }
  if (status === 507 || /quota|storage limit|insufficient storage/i.test(body)) {
    return "__server__مساحة التخزين على الخادم ممتلئة. على الإدارة حذف مرفقات قديمة أو توسيع الخطة.";
  }
  if (status === 401 || status === 403) {
    return "__server__انتهت جلستك أو لا صلاحية لك بالرفع. أعد تسجيل الدخول.";
  }
  return `تعذّر الرفع (${status}).`;
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
