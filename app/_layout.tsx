import { useCallback, useEffect, useState } from "react";
import { I18nManager, Platform, useColorScheme } from "react-native";
import { useFonts, Tajawal_400Regular, Tajawal_500Medium, Tajawal_700Bold } from "@expo-google-fonts/tajawal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { DemoRibbon } from "@/components/DemoRibbon";
import { RestartNotice } from "@/components/RestartNotice";
import { UpdateBanner } from "@/components/UpdateBanner";
import { MisconfiguredNotice } from "@/components/MisconfiguredNotice";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ToastHost } from "@/components/ToastHost";
import { colors, setColorScheme, takeRoute, type ColorScheme } from "@/constants";
import { useSettingsStore } from "@/store/settingsStore";
import { USE_MOCK_DATA } from "@/services/config";
import { isSupabaseConfigured } from "@/services/supabase";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/**
 * أندرويد يقرأ اتّجاه التخطيط مرّة واحدة عند إنشاء الشاشة — قبل أن يصل هذا
 * الفرض. فمن كانت لغة هاتفه غير عربية رأى، في أوّل فتحة بعد التثبيت، واجهةً
 * عربية مقلوبة الاتّجاه. كان التعليق هنا يذكر ذلك ويمضي؛ وذِكرُ العطل ليس
 * معالجةً له. فنلتقط الحالة ونقولها للمستخدم بدل أن يواجه واجهةً معطوبة
 * لا يفهم سببها.
 *
 * ويُستثنى الويب: لا اتّجاه يُفرض فيه بهذه الطريقة، فلا موضع للرسالة أصلًا.
 */
const RTL_PENDING = Platform.OS !== "web" && !I18nManager.isRTL;

if (RTL_PENDING) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
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
  const [ignoreRtl, setIgnoreRtl] = useState(false);

  // المظهر: ما اختاره المستخدم، أو إعداد هاتفه إن ترك الاختيار «تلقائي».
  // ويُحسب قبل أوّل رسم لا بعده: لو رُسمت الشاشة فاتحةً ثم انقلبت داكنة
  // لومضت في وجه من فتح التطبيق في الظلمة.
  const themePreference = useSettingsStore((state) => state.theme);
  const settingsHydrated = useSettingsStore((state) => state.hasHydrated);
  const systemScheme = useColorScheme();
  const scheme: ColorScheme =
    themePreference === "system" ? (systemScheme === "dark" ? "dark" : "light") : themePreference;
  setColorScheme(scheme);

  useEffect(() => {
    if (fontsLoaded || fontError) setAppReady(true);
  }, [fontsLoaded, fontError]);

  // ولو لم يصل الخطّ ولم يُعلن فشله — وهذا يقع حين يُقطع الطلب بلا ردّ.
  // والمهلة نفسها تغطّي قراءة الإعدادات: تخزينٌ لا يردّ لا يوقف التطبيق.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppReady(true);
      setTimedOut(true);
    }, FONT_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  // بعد إعادة التركيب لتبديل المظهر: عُد إلى الشاشة التي بُدّل منها.
  useEffect(() => {
    const path = takeRoute();
    if (!path) return;
    const timer = setTimeout(() => router.push(path as never), 60);
    return () => clearTimeout(timer);
  }, [scheme]);

  const onLayoutRootView = useCallback(() => {
    if (appReady) SplashScreen.hideAsync().catch(() => undefined);
  }, [appReady]);

  if (!appReady || !(settingsHydrated || timedOut)) return null;

  // بعد إضافة expo-updates صار بالإمكان إعادة التحميل بأمر واحد بدل أن
  // يُطلب من صاحب الجهاز أن يُغلق ويفتح. وتبقى الرسالة لمن تعذّرت عليه.
  if (RTL_PENDING && !ignoreRtl) {
    return (
      <SafeAreaProvider onLayout={onLayoutRootView}>
        <StatusBar style="dark" backgroundColor={colors.background} />
        <RestartNotice onSkip={() => setIgnoreRtl(true)} />
      </SafeAreaProvider>
    );
  }

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

  // ‏key={scheme}: تبديل المظهر يعيد تركيب الشجرة كلّها، فتُقرأ اللوحة
  // الجديدة في كل شاشة. وإعادة الرسم وحدها لا تكفي: الشاشات المركّبة تحت
  // الإعدادات لا تُعاد إلا إن تغيّر ما تعتمد عليه — وهي لا تعتمد على شيء.
  return (
    <SafeAreaProvider key={scheme} onLayout={onLayoutRootView}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" backgroundColor={scheme === "dark" ? colors.background : colors.primary} />
        <DemoRibbon />
        <OfflineBanner />
        <UpdateBanner />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
        <ToastHost />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
