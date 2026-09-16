import { StyleSheet } from "react-native";
import { getColorScheme, type ColorScheme } from "./colors";

type NamedStyles<T> = { [P in keyof T]: import("react-native").ViewStyle | import("react-native").TextStyle | import("react-native").ImageStyle };

/**
 * ‏StyleSheet.create يتبع المظهر.
 *
 * الأنماط في مئة ملفّ مكتوبة هكذا: `StyleSheet.create({ card: { backgroundColor:
 * colors.surface } })` — تُقرأ `colors.surface` مرّةً عند تحميل الملفّ وتتجمّد
 * على قيمتها. فلو بُدّل المظهر بعد ذلك بقيت البطاقات بيضاء في الليل.
 *
 * وهذه تؤجّل البناء: تأخذ دالّةً تُعيد الأنماط، وتستدعيها مرّةً لكل مظهرٍ
 * عند أوّل طلب، وتحفظ الناتج. والمُعاد وكيلٌ يوجّه `styles.card` إلى نسخة
 * المظهر النشط. فالتحويل في كل ملفّ سطرٌ واحد: `StyleSheet.create({` تصير
 * `themed(() => ({` — ولا يتغيّر ما بداخلها.
 */
export function themed<T extends NamedStyles<T>>(factory: () => T): T {
  const cache: Partial<Record<ColorScheme, T>> = {};
  const resolve = (): T => {
    const scheme = getColorScheme();
    return (cache[scheme] ??= StyleSheet.create(factory()));
  };
  return new Proxy({} as T, {
    get(_target, key) {
      return resolve()[key as keyof T];
    },
    has(_target, key) {
      return key in resolve();
    },
    ownKeys() {
      return Reflect.ownKeys(resolve());
    },
    getOwnPropertyDescriptor(_target, key) {
      const value = resolve()[key as keyof T];
      return value === undefined
        ? undefined
        : { value, enumerable: true, configurable: true, writable: false };
    },
  });
}

/**
 * تبديل المظهر يُعيد تركيب شجرة التطبيق كلّها (انظر app/_layout.tsx) —
 * وإعادة التركيب تعيد المتصفّح إلى شاشته الأولى. فمن بدّل المظهر من
 * الإعدادات وجد نفسه في الرئيسية، وهذا مربك. فتُحفظ الشاشة هنا قبل التبديل
 * وتُستعاد بعده.
 */
let pendingRoute: string | null = null;

export function rememberRoute(path: string): void {
  pendingRoute = path;
}

export function takeRoute(): string | null {
  const path = pendingRoute;
  pendingRoute = null;
  return path;
}
