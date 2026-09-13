import { useCallback, useEffect, useState } from "react";
import { I18nManager } from "react-native";
import { useFonts, Tajawal_400Regular, Tajawal_500Medium, Tajawal_700Bold } from "@expo-google-fonts/tajawal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { DemoRibbon } from "@/components/DemoRibbon";
import { MisconfiguredNotice } from "@/components/MisconfiguredNotice";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ToastHost } from "@/components/ToastHost";
import { colors } from "@/constants";
import { USE_MOCK_DATA } from "@/services/config";
import { isSupabaseConfigured } from "@/services/supabase";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
  // يتطلب هذا إعادة تحميل JS مرة واحدة عند أول تشغيل على بعض المنصات ليأخذ التخطيط تأثيره الكامل.
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      // محاولتان إضافيتان بتباعد متزايد — تكفيان لانقطاع لحظي دون إبطاء الفشل الحقيقي.
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    },
  },
});

/**
 * كم ننتظر الخطّ قبل أن نمضي بدونه.
 *
 * الخطّ زينة، والتطبيق ضرورة. وكان الانتظار مفتوحًا: إن لم يصل الملفّ — شبكة
 * بطيئة، أو متصفّح يمنع تحميله من أصل آخر — بقي التطبيق على شاشة البداية إلى
 * الأبد. أن تُقرأ الشاشة بخطّ النظام خيرٌ من ألّا تُقرأ.
 */
const FONT_WAIT_MS = 4000;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
  });
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) setAppReady(true);
  }, [fontsLoaded, fontError]);

  // ولو لم يصل الخطّ ولم يُعلن فشله — وهذا يقع حين يُقطع الطلب بلا ردّ.
  useEffect(() => {
    const timer = setTimeout(() => setAppReady(true), FONT_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  const onLayoutRootView = useCallback(() => {
    if (appReady) SplashScreen.hideAsync().catch(() => undefined);
  }, [appReady]);

  if (!appReady) return null;

  // نسخة حقيقية خرجت بلا مفاتيح: نقف مرة واحدة برسالة صريحة بدل أن يفشل كل
  // طلب على حدة برسالة شبكة تُقرأ خطأً على أنها ضعف إنترنت.
  if (!USE_MOCK_DATA && !isSupabaseConfigured) {
    return (
      <SafeAreaProvider onLayout={onLayoutRootView}>
        <StatusBar style="light" backgroundColor={colors.primary} />
        <MisconfiguredNotice />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" backgroundColor={colors.primary} />
        <DemoRibbon />
        <OfflineBanner />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
        <ToastHost />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
