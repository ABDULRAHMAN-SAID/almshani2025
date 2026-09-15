import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";
import { showToast } from "@/store/toastStore";

/**
 * العَلَم يُكتب قبل إعادة التحميل ويُقرأ بعدها.
 *
 * إعادةُ التحميل تمسح كل ما في الذاكرة، فلا سبيل لأن تقول الشاشة الجديدة
 * «حدث تحديث» إلا أن تجد أثرًا تركته النسخة القديمة على القرص.
 */
const APPLIED_KEY = "update-applied";

/**
 * يجلب التحديث ويطبّقه بلا أن يحذف أحدٌ التطبيق ويعيد تحميله.
 *
 * ‏expo-updates يفحص عند الإقلاع من تلقائه، لكنّ تطبيقًا يبقى مفتوحًا في
 * الخلفية أيامًا لا يُقلع، فلا يرى تحديثًا نُشر بعد فتحه. فنفحص عند كل عودة
 * إلى المقدّمة أيضًا.
 *
 * والتطبيق لا يُعاد تحميله في وجه صاحبه وهو يكتب رسالة أو يملأ نموذجًا:
 * يُنزَّل التحديث في صمت، ويُعرض شريط يُخبره، ويُطبَّق عند الفتحة التالية إن
 * تجاهله.
 */
export function useAppUpdate() {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async (announce = false) => {
    // في وضع التطوير لا تحديثات، ومحاولة الفحص ترمي خطأً مربكًا في السجلّ.
    if (__DEV__ || !Updates.isEnabled) {
      if (announce) showToast("التحديثات لا تعمل في هذه النسخة", "info");
      return;
    }
    if (announce) setChecking(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        if (announce) showToast("أنت على آخر نسخة", "success");
        return;
      }
      await Updates.fetchUpdateAsync();
      setReady(true);
      if (announce) showToast("نُزّل التحديث — اضغط الشريط أعلى الشاشة لتطبيقه", "success");
    } catch {
      // انقطاع شبكة أو خادم لا يجيب. ويُسكت عنه إلا حين طلب المستخدم الفحص
      // بنفسه: من ضغط زرًّا ينتظر جوابًا، ومن لم يضغط لا شأن له بفحصٍ فشل.
      if (announce) showToast("تعذّر الفحص — تحقّق من الاتصال", "error");
    } finally {
      if (announce) setChecking(false);
    }
  }, []);

  useEffect(() => {
    // بعد إعادة التحميل: أخبِره أن ما انتظره وقع. وبلا هذا يعود التطبيق كما
    // هو في عينه، فلا يعرف أطُبِّق التحديث أم ضاع.
    void AsyncStorage.getItem(APPLIED_KEY).then((flag) => {
      if (!flag) return;
      void AsyncStorage.removeItem(APPLIED_KEY);
      showToast("تم تحديث التطبيق إلى آخر نسخة", "success");
    });

    void check();
    const sub = AppState.addEventListener("change", (status) => {
      if (status === "active") void check();
    });
    return () => sub.remove();
  }, [check]);

  /** يطبّق ما نُزّل — بطلب من المستخدم لا من تلقائنا. */
  const applyNow = async () => {
    try {
      await AsyncStorage.setItem(APPLIED_KEY, "1");
      await Updates.reloadAsync();
    } catch {
      // يبقى مطبَّقًا عند الفتحة التالية. والعَلَم يُمسح لئلّا تُعلن نسخةٌ
      // لم تتغيّر أنها تحدّثت.
      await AsyncStorage.removeItem(APPLIED_KEY).catch(() => undefined);
    }
  };

  return { updateReady: ready, applyNow, checkNow: () => check(true), checking };
}
