import { useEffect, useState } from "react";
import { Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";

const isWeb = Platform.OS === "web";

/**
 * على الويب تتحقّق المكتبة من الإنترنت بطلب شبكة دوريّ. والطلب يفشل لأسبابٍ
 * لا علاقة لها بالإنترنت: الصفحة تحت مسارٍ لا جذر النطاق، أو معروضة في إطارٍ
 * معزول لا أصل له فتمنع سياسة CORS كل طلبٍ منه. وحينها يعلّق التطبيق شريط
 * «لا يوجد اتصال» فوق كل شاشة، والإنترنت سليم.
 *
 * فنوقف ذلك الطلب على الويب ونكتفي بما يقوله المتصفّح نفسه (navigator.onLine)
 * — وهو ما تفعله أكثر مواقع الويب. يفوتنا بذلك تمييز شبكة موصولة بلا إنترنت،
 * وهو أهون من تحذيرٍ كاذب لا يزول.
 */
if (isWeb) {
  NetInfo.configure({ reachabilityShouldRun: () => false });
}

/**
 * حالة الاتصال بالإنترنت.
 *
 * نربطها أيضًا بـ onlineManager في React Query، فتتوقف المحاولات تلقائيًا عند
 * انقطاع الشبكة وتُعاد فور عودتها دون أن تكتب كل شاشة منطقها بنفسها.
 */
export function useConnection() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      // isInternetReachable قد تكون null قبل أن تُحسم، فنعتبرها متصلة حتى تُحسم.
      const online = isWeb
        ? Boolean(state.isConnected)
        : Boolean(state.isConnected) && state.isInternetReachable !== false;
      setIsOnline(online);
      onlineManager.setOnline(online);
    });
  }, []);

  return { isOnline };
}
