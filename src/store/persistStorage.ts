import AsyncStorage from "@react-native-async-storage/async-storage";
import { createJSONStorage } from "zustand/middleware";

/**
 * أثناء التصيير على الخادم (Static Rendering) لا يوجد `window`، وAsyncStorage على
 * الويب يقرأ من `window.localStorage` مباشرة فينهار البناء. لذلك نستبدله هناك
 * بتخزين لا يفعل شيئًا. على الهاتف يكون `window` معرّفًا دائمًا فيُستخدم الحقيقي.
 */
const isServerRender = typeof window === "undefined";

export const safeStorage = {
  getItem: async (_key: string) => (isServerRender ? null : AsyncStorage.getItem(_key)),
  setItem: async (_key: string, value: string) =>
    isServerRender ? undefined : AsyncStorage.setItem(_key, value),
  removeItem: async (_key: string) => (isServerRender ? undefined : AsyncStorage.removeItem(_key)),
};

export const persistStorage = createJSONStorage(() => safeStorage);
