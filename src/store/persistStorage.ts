import AsyncStorage from "@react-native-async-storage/async-storage";
import { createJSONStorage } from "zustand/middleware";

/**
 * تخزين لا يسقط التطبيق مهما كان حال الجهاز.
 *
 * أثناء التصيير الثابت لا يوجد `window`، وAsyncStorage على الويب يقرأ من
 * `window.localStorage` مباشرة فينهار البناء.
 *
 * وأخطر من ذلك: المتصفّح قد يمنع التخزين أصلًا — في التصفّح الخاص، أو حين
 * يُحجب تخزين المواقع، أو داخل إطار معزول — فيرمي مجرّدُ لمس `localStorage`
 * خطأً. وقبل هذا الحرس كان ذلك الخطأ يوقف استرجاع الحالة، فيبقى التطبيق على
 * شاشة البداية إلى الأبد: لا شاشة دخول ولا رسالة تفسّر ما جرى.
 *
 * فإن تعذّر التخزين حفظنا في الذاكرة: تضيع البيانات بإغلاق الصفحة، لكن
 * التطبيق يعمل — وهذا خير من تطبيق لا يفتح.
 */
const isServerRender = typeof window === "undefined";

const memory = new Map<string, string>();
let denied = false;

function fallBack(reason: unknown) {
  if (!denied) {
    denied = true;
    console.warn("[storage] المتصفّح يمنع التخزين — نكتفي بالذاكرة لهذه الجلسة:", reason);
  }
}

async function attempt<T>(real: () => Promise<T>, memoryOnly: () => T): Promise<T> {
  if (isServerRender || denied) return memoryOnly();
  try {
    // بالانتظار هنا لا بإعادة الوعد: الرفض يقع داخل try فيُلتقط، ولو أُعيد
    // الوعد كما هو لخرج الرفض من هنا ولم يوقفه شيء.
    return await real();
  } catch (error) {
    fallBack(error);
    return memoryOnly();
  }
}

export const safeStorage = {
  getItem: (key: string) =>
    attempt(
      () => AsyncStorage.getItem(key),
      () => memory.get(key) ?? null
    ),
  setItem: (key: string, value: string) =>
    attempt<void>(
      async () => {
        await AsyncStorage.setItem(key, value);
      },
      () => {
        memory.set(key, value);
      }
    ),
  removeItem: (key: string) =>
    attempt<void>(
      async () => {
        await AsyncStorage.removeItem(key);
      },
      () => {
        memory.delete(key);
      }
    ),
};

export const persistStorage = createJSONStorage(() => safeStorage);
