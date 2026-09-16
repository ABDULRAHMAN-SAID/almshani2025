import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "./persistStorage";

/**
 * تفضيل الطقس: هل يتبع الموقع، أم مكان اخترته بيدك؟
 *
 * والاختيار اليدوي ليس زينة: من رفض إذن الموقع — أو كان في مبنى لا تصل إليه
 * الإشارة — يبقى بلا طقس أصلًا لولاه. ومن أراد أن يعرف طقس مصيرة وهو في
 * صلالة لا يجد سبيلًا. فالافتراضي أن يتبع الموقع، والاختيار متروك.
 */
interface WeatherState {
  /** مفتاح مكان من PLACES، أو null ليتبع الموقع. */
  manualPlace: string | null;
  setManualPlace: (key: string | null) => void;
}

export const useWeatherStore = create<WeatherState>()(
  persist(
    (set) => ({
      manualPlace: null,
      setManualPlace: (key) => set({ manualPlace: key }),
    }),
    { name: "anshatati-weather", storage: persistStorage }
  )
);
