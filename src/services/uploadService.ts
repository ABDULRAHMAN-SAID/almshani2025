import * as ImagePicker from "expo-image-picker";
import { USE_MOCK_DATA } from "./config";
import { supabase } from "./supabase";

/** الحاوية العامة في Supabase Storage — القراءة للجميع والكتابة للإدارة فقط. */
export const IMAGE_BUCKET = "activity-images";

/** أقصى حجم مقبول بعد الضغط، حتى لا تُرفع صور ضخمة على شبكة بطيئة. */
const MAX_BYTES = 3 * 1024 * 1024;

export interface PickedImage {
  uri: string;
  base64: string;
  width: number;
  height: number;
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * فكّ ترميز base64 إلى بايتات. مكتوب هنا بدل إضافة اعتمادية، ولأن `atob`
 * غير مضمونة في React Native.
 */
function base64ToBytes(base64: string): Uint8Array {
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

/**
 * يفتح معرض الصور بعد طلب الإذن. يُرجع `null` إذا رفض المستخدم الإذن أو ألغى
 * الاختيار — وكلاهما ليس خطأ، فلا يُرمى استثناء.
 */
export async function pickImage(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("لم يُسمح بالوصول إلى الصور. فعّل الإذن من إعدادات الهاتف.");
  }

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

  const bytes = Math.floor((asset.base64.length * 3) / 4);
  if (bytes > MAX_BYTES) {
    throw new Error("حجم الصورة كبير. اختر صورة أصغر من 3 ميجابايت.");
  }

  return { uri: asset.uri, base64: asset.base64, width: asset.width, height: asset.height };
}

/**
 * يرفع الصورة ويُرجع رابطها.
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

/** يحذف صورة مرفوعة. يتجاهل الروابط المحلية لأنها ليست على الخادم. */
export async function deleteImage(url: string): Promise<void> {
  if (USE_MOCK_DATA || !url.includes(`/${IMAGE_BUCKET}/`)) return;
  const path = url.split(`/${IMAGE_BUCKET}/`)[1];
  if (!path) return;
  await supabase.storage.from(IMAGE_BUCKET).remove([path]);
}
