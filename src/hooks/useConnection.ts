import { useEffect, useState } from "react";
import { Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";

// على الويب تفحص المكتبة الاتصال بطلب جذر النطاق "/" افتراضًا. وهذا يخطئ متى
// نُشر التطبيق في مجلّد داخل نطاق — كصفحات GitHub التي تقدّمه من
// /almshani2025 بينما جذر النطاق لا شيء فيه: يردّ 404 فيظنّ التطبيق أن لا
// إنترنت ويعلّق الشريط أبدًا. فنسأل عن صفحة التطبيق نفسها، وهي موجودة حيثما
// نُشر.
if (Platform.OS === "web") {
  NetInfo.configure({ reachabilityUrl: `${process.env.EXPO_BASE_URL ?? ""}/` });
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
      const online = Boolean(state.isConnected) && state.isInternetReachable !== false;
      setIsOnline(online);
      onlineManager.setOnline(online);
    });
  }, []);

  return { isOnline };
}
