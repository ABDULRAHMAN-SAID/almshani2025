import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";

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
