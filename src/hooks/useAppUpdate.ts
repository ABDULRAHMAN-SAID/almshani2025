import { useEffect, useState } from "react";
import { AppState } from "react-native";
import * as Updates from "expo-updates";

/**
 * يجلب التحديث ويطبّقه بلا أن يحذف أحدٌ التطبيق ويعيد تحميله.
 *
 * ‏expo-updates يفحص عند الإقلاع من تلقائه، لكنّ تطبيقًا يبقى مفتوحًا في
 * الخلفية أيامًا لا يُقلع، فلا يرى تحديثًا نُشر بعد فتحه. فنفحص عند كل عودة
 * إلى المقدّمة أيضًا.
 *
 * والتطبيق لا يُعاد تحميله في وجه صاحبه وهو يكتب رسالة أو يملأ نموذجًا:
 * يُنزَّل التحديث في صمت، ويُطبَّق عند الفتحة التالية. إلا أن يطلب هو ذلك من
 * الإعدادات، فحينها يُعاد فورًا.
 */
export function useAppUpdate() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // في وضع التطوير لا تحديثات، ومحاولة الفحص ترمي خطأً مربكًا في السجلّ.
    if (__DEV__ || !Updates.isEnabled) return;

    const check = async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (!result.isAvailable) return;
        await Updates.fetchUpdateAsync();
        setReady(true);
      } catch {
        // انقطاع شبكة أو خادم لا يجيب: التطبيق يعمل بما عنده، ولا شأن
        // للمستخدم بفشل فحصٍ لم يطلبه.
      }
    };

    void check();
    const sub = AppState.addEventListener("change", (status) => {
      if (status === "active") void check();
    });
    return () => sub.remove();
  }, []);

  /** يطبّق ما نُزّل — بطلب من المستخدم لا من تلقائنا. */
  const applyNow = async () => {
    try {
      await Updates.reloadAsync();
    } catch {
      /* يبقى مطبَّقًا عند الفتحة التالية */
    }
  };

  return { updateReady: ready, applyNow };
}
