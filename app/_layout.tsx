import { useCallback, useEffect, useState } from "react";
import { I18nManager } from "react-native";
import { useFonts, Tajawal_400Regular, Tajawal_500Medium, Tajawal_700Bold } from "@expo-google-fonts/tajawal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { ToastHost } from "@/components/ToastHost";
import { colors } from "@/constants";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
  // يتطلب هذا إعادة تحميل JS مرة واحدة عند أول تشغيل على بعض المنصات ليأخذ التخطيط تأثيره الكامل.
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Tajawal_400Regular, Tajawal_500Medium, Tajawal_700Bold });
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    if (fontsLoaded) setAppReady(true);
  }, [fontsLoaded]);

  const onLayoutRootView = useCallback(() => {
    if (appReady) SplashScreen.hideAsync().catch(() => undefined);
  }, [appReady]);

  if (!appReady) return null;

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" backgroundColor={colors.primary} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
        <ToastHost />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
