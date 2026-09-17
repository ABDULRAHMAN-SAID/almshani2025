import { useEffect, useRef } from "react";
import { Animated, Easing, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DemoApp } from "@/components/DemoApp";
import { PhoneFrame } from "@/components/PhoneFrame";
import { colors, radius, spacing, themed, typography } from "@/constants";
import { KIND } from "@/product/kinds";
import { INCLUDED, NOT_INCLUDED, PERIOD_LABEL, PRICE_LABEL, PRICE_OMR, SALES_WHATSAPP } from "@/product/plan";
import { arabicDigits } from "@/product/format";
import { demoOf, TEMPLATES } from "@/product/templates";
import { useProjectStore } from "@/store/projectStore";

/**
 * صفحة البيع — أوّل ما يُفتح، وعليها يُقرَّر.
 *
 * وصاحب المشروع الصغير لا يقرأ «حلولًا رقمية»: يسأل ثلاثة أسئلة ويمضي — ما
 * هذا؟ كم يكلّف؟ وهل أستطيعه أنا؟ فالصفحة مرتّبة على هذا الترتيب لا على
 * ترتيب ما نفخر به: ثلاثة هواتف تعمل، ثم ما يصير لمشروعه، ثم ثلاث خطوات،
 * ثم السعر صريحًا بلا «تواصل معنا للسعر»، ثم أسئلةٌ تُقال في المجلس لا في
 * الكتيّبات.
 *
 * والسعر مكتوبٌ في الصدر وفي الوسط وفي الذيل: من أخفى سعره ظُنّ غاليًا.
 */

const STEPS = [
  { icon: "apps-outline", title: "اختر نوع تطبيقك", body: "ستّة أنواع جاهزة: حجز، مطعم، متجر، عيادة، تعليم، صالون. افتحها كلّها وجرّبها قبل أن تقرّر." },
  { icon: "create-outline", title: "اكتب محتواك", body: "اسم مشروعك، قائمتك أو خدماتك بأسعارها، أوقات عملك، وأرقامك. والمعاينة تتغيّر مع كل حرف." },
  { icon: "rocket-outline", title: "انشر", body: "يخرج لك رابطٌ خاص ورمز QR تعلّقه في المحل. وأيّ تعديلٍ بعدها يظهر في الحال." },
];

const FEATURES = [
  { icon: "link-outline", title: "رابطٌ خاص", body: "يفتحه زبونك من أيّ هاتف بلا تحميل ولا متجر تطبيقات." },
  { icon: "logo-whatsapp", title: "كل شيء لواتسابك", body: "الطلب والحجز يصلانك مكتوبين — بلا لوحة تحكّم تتعلّمها." },
  { icon: "qr-code-outline", title: "رمز QR", body: "يُعلَّق على الطاولة أو الواجهة، يوجّه إليه الزبون كاميرته." },
  { icon: "flash-outline", title: "تعديلٌ فوري", body: "غيّرت سعرًا؟ يظهر عند زبائنك في اللحظة نفسها." },
  { icon: "shield-checkmark-outline", title: "بلا عمولة", body: "طلباتك لك كاملة. لا نأخذ نسبةً من بيعك أبدًا." },
  { icon: "eye-off-outline", title: "بلا إعلانات", body: "لا إعلان غريبٍ يظهر في تطبيقك ولا يسرق زبونك." },
];

const FAQ = [
  { q: "هل أحتاج خبرة في الحاسب؟", a: "لا. إن كنت تكتب رسالة واتساب فأنت تستطيع. كلّ شيء اختيارٌ من قائمة أو كتابةٌ في خانة." },
  { q: "كم يأخذ حتى يجهز؟", a: "أقلّ من ساعة إن كانت قائمتك جاهزة. اختر النوع، اكتب، انشر." },
  { q: "أقدر أغيّر بعد النشر؟", a: "نعم، بلا حدّ وبلا رسوم. غيّر الأسعار أو الصور أو نوع التطبيق كلّه متى شئت." },
  { q: "ماذا لو لم يعجبني؟", a: "ترى كل شيء قبل أن تدفع: النماذج مفتوحة لك مجانًا وبلا حساب، ونجهّز تطبيقك باسمك قبل السداد." },
  { q: "هل تأخذون نسبة من مبيعاتي؟", a: "لا. الاشتراك السنوي فقط، والطلبات تصل واتسابك مباشرةً بلا وسيط." },
  { q: "وإن توقّفت عن التجديد؟", a: "محتواك يبقى محفوظًا، ويعود الرابط للعمل ساعةَ تجدّد." },
];

export default function Landing() {
  const insets = useSafeAreaInsets();
  const started = useProjectStore((state) => state.started);
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(rise, { toValue: 1, duration: 850, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [rise]);

  const lift = rise.interpolate({ inputRange: [0, 1], outputRange: [34, 0] });
  const trio = [TEMPLATES[1], TEMPLATES[0], TEMPLATES[4]];

  const sales = (message: string) =>
    void Linking.openURL(`https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(message)}`).catch(() => undefined);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ——— الصدر ——— */}
        <LinearGradient
          colors={[colors.primaryLight, colors.primary, colors.primaryDark]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}
        >
          <View style={styles.brandRow}>
            <Text style={styles.brand}>واجهة</Text>
            {started ? (
              <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/project")} style={styles.resume}>
                <Text style={styles.resumeText}>تابع مشروعي</Text>
                <Ionicons name="arrow-back" size={13} color={colors.primary} />
              </Pressable>
            ) : null}
          </View>

          <Animated.View style={{ opacity: rise, transform: [{ translateY: lift }] }}>
            <Text style={styles.headline}>تطبيقٌ لمشروعك{"\n"}في مساءٍ واحد</Text>
            <Text style={styles.sub}>
              ستّة تطبيقاتٍ تعمل الآن في الشاشة — افتحها والمسها واحجز فيها. وإن أعجبك،
              نجهّز تطبيقك باسمك وقائمتك برابطٍ خاص.
            </Text>
          </Animated.View>

          {/* ثلاثة هواتف تعمل، لا صور: أوّل ما يُرى يجب أن يكون المنتج نفسه. */}
          <View style={styles.stage}>
            {trio.map((template, index) => (
              <Animated.View
                key={template.id}
                style={[
                  styles.phone,
                  {
                    opacity: rise,
                    transform: [
                      { translateY: lift },
                      { translateX: (index - 1) * 92 },
                      { rotate: `${(index - 1) * 8}deg` },
                      { scale: index === 1 ? 1 : 0.88 },
                    ],
                    zIndex: index === 1 ? 3 : 1,
                  },
                ]}
                pointerEvents="none"
              >
                <PhoneFrame width={168} statusTint={template.skin.hero === "plain" ? template.skin.text : "#FFFFFF"}>
                  <DemoApp project={demoOf(template.id)} template={template} />
                </PhoneFrame>
              </Animated.View>
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(tabs)")}
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          >
            <Text style={styles.ctaText}>افتح النماذج وجرّبها</Text>
            <Ionicons name="arrow-back" size={18} color={colors.primary} />
          </Pressable>
          <Text style={styles.ctaNote}>
            {`مجانًا وبلا حساب · وتطبيقك ${PRICE_LABEL} ${PERIOD_LABEL}`}
          </Text>
        </LinearGradient>

        {/* ——— شريط الطمأنة ——— */}
        <View style={styles.trust}>
          {["بلا مصمّم", "بلا مبرمج", "بلا عمولة"].map((word) => (
            <View key={word} style={styles.trustItem}>
              <Ionicons name="checkmark-circle" size={15} color={colors.success} />
              <Text style={styles.trustText}>{word}</Text>
            </View>
          ))}
        </View>

        {/* ——— الأنواع الستّة ——— */}
        <Section title="ستّة أنواع — أيّها مشروعك؟" note="اضغط أيًّا منها لتفتحه وتجرّبه بنفسك.">
          <View style={styles.kinds}>
            {TEMPLATES.map((template) => {
              const meta = KIND[template.kind];
              return (
                <Pressable
                  key={template.id}
                  accessibilityRole="button"
                  onPress={() => router.push(`/preview/${template.id}`)}
                  style={({ pressed }) => [styles.kind, pressed && styles.pressed]}
                >
                  <View style={[styles.kindIcon, { backgroundColor: `${template.skin.brand}18` }]}>
                    <Ionicons
                      name={meta.icon as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color={template.skin.brand}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.kindName}>{`${meta.label} — ${template.name}`}</Text>
                    <Text style={styles.kindBody}>{template.pitch}</Text>
                  </View>
                  <Ionicons name="chevron-back" size={16} color={colors.textMuted} />
                </Pressable>
              );
            })}
          </View>
        </Section>

        {/* ——— كيف تعمل ——— */}
        <Section title="ثلاث خطوات" note="من فتح التطبيق إلى رابطٍ تعطيه زبونك.">
          <View style={{ gap: spacing.md }}>
            {STEPS.map((step, index) => (
              <View key={step.title} style={styles.step}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{arabicDigits(index + 1)}</Text>
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepBody}>{step.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </Section>

        {/* ——— ما تحصل عليه ——— */}
        <Section title="ماذا يصير لمشروعك">
          <View style={styles.features}>
            {FEATURES.map((feature) => (
              <View key={feature.title} style={styles.feature}>
                <Ionicons name={feature.icon as keyof typeof Ionicons.glyphMap} size={19} color={colors.marine} />
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureBody}>{feature.body}</Text>
              </View>
            ))}
          </View>
        </Section>

        {/* ——— السعر ——— */}
        <View style={styles.priceWrap}>
          <LinearGradient
            colors={[colors.primaryLight, colors.primary, colors.primaryDark]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.priceCard}
          >
            <Text style={styles.priceLabel}>اشتراك واحد، كل شيء فيه</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceValue} numberOfLines={1}>{PRICE_LABEL}</Text>
              <Text style={styles.pricePeriod}>{PERIOD_LABEL}</Text>
            </View>
            <Text style={styles.priceNote}>
              {`أقلّ من ${arabicDigits((PRICE_OMR / 12).toFixed(1))} ر.ع. في الشهر — ثمنُ فنجانَي قهوة.`}
            </Text>

            <View style={styles.priceList}>
              {INCLUDED.map((line) => (
                <View key={line} style={styles.priceLine}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.gold} />
                  <Text style={styles.priceLineText}>{line}</Text>
                </View>
              ))}
              {NOT_INCLUDED.map((line) => (
                <View key={line} style={styles.priceLine}>
                  <Ionicons name="remove-circle-outline" size={16} color={colors.onPrimaryMuted} />
                  <Text style={[styles.priceLineText, styles.priceLineOff]}>{line}</Text>
                </View>
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => sales(`السلام عليكم، أريد تطبيقًا لمشروعي عبر واجهة (${PRICE_OMR} ر.ع. للسنة)`)}
              style={({ pressed }) => [styles.buy, pressed && styles.pressed]}
            >
              <Ionicons name="logo-whatsapp" size={18} color={colors.primary} />
              <Text style={styles.buyText}>اطلب تطبيقك</Text>
            </Pressable>
            <Text style={styles.buyNote}>
              نجهّزه باسمك ومحتواك ونُريك إيّاه — ولا تدفع قبل أن تراه جاهزًا.
            </Text>
          </LinearGradient>
        </View>

        {/* ——— أسئلة ——— */}
        <Section title="أسئلة تُسأل كثيرًا">
          <View style={styles.faq}>
            {FAQ.map((item, index) => (
              <View key={item.q} style={[styles.faqItem, index > 0 && styles.faqDivider]}>
                <Text style={styles.faqQ}>{item.q}</Text>
                <Text style={styles.faqA}>{item.a}</Text>
              </View>
            ))}
          </View>
        </Section>

        {/* ——— الذيل ——— */}
        <View style={styles.foot}>
          <Text style={styles.footBrand}>واجهة</Text>
          <Text style={styles.footLine}>تطبيقاتٌ ومواقع لأصحاب المشاريع — سلطنة عُمان</Text>
          <View style={styles.footRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => sales("السلام عليكم، عندي سؤال عن واجهة")}
              style={({ pressed }) => [styles.footButton, pressed && styles.pressed]}
            >
              <Ionicons name="logo-whatsapp" size={16} color={colors.textOnPrimary} />
              <Text style={styles.footButtonText}>كلّمنا</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/(tabs)")}
              style={({ pressed }) => [styles.footGhost, pressed && styles.pressed]}
            >
              <Text style={styles.footGhostText}>افتح النماذج</Text>
            </Pressable>
          </View>
          <Text style={styles.footFine}>إعداد وتنفيذ: عبدالرحمن بن سعيد المعشني</Text>
        </View>
      </ScrollView>

      {/* شريطٌ ثابت أسفل الشاشة: من قرأ نصف الصفحة لا يُطلب منه أن يعود
          إلى أعلاها ليجد الزرّ. */}
      <View style={[styles.dock, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(tabs)")}
          style={({ pressed }) => [styles.dockButton, pressed && styles.pressed]}
        >
          <Ionicons name="phone-portrait-outline" size={17} color={colors.textOnPrimary} />
          <Text style={styles.dockText}>جرّب النماذج مجانًا</Text>
        </Pressable>
        <Text style={styles.dockPrice} numberOfLines={1}>{PRICE_LABEL}</Text>
      </View>
    </View>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {note ? <Text style={styles.sectionNote}>{note}</Text> : null}
      {children}
    </View>
  );
}

const styles = themed(() => ({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 96 },

  hero: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.sm },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  brand: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: colors.gold, letterSpacing: 1.5, flex: 1 },
  resume: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: colors.gold, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: 6,
  },
  resumeText: { fontFamily: "Tajawal_500Medium", fontSize: 12, color: colors.primary },
  headline: { fontFamily: "Tajawal_700Bold", fontSize: 28, lineHeight: 40, color: colors.textOnPrimary },
  sub: { fontFamily: "Tajawal_400Regular", fontSize: 14, lineHeight: 24, color: colors.textOnPrimaryMuted, marginTop: 6 },

  stage: { height: 300, alignItems: "center", justifyContent: "center", marginTop: spacing.md },
  phone: { position: "absolute" },

  cta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: colors.gold, borderRadius: radius.pill, paddingVertical: spacing.lg, marginTop: spacing.sm,
  },
  ctaText: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: colors.primary },
  ctaNote: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: colors.textOnPrimaryMuted, textAlign: "center" },

  trust: {
    flexDirection: "row", justifyContent: "center", gap: spacing.lg,
    backgroundColor: colors.surface, paddingVertical: spacing.md,
  },
  trustItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  trustText: { ...typography.caption, fontSize: 12, color: colors.textSecondary },

  section: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, gap: spacing.sm },
  sectionTitle: { ...typography.h2, fontSize: 21 },
  sectionNote: { ...typography.bodyMuted, marginBottom: spacing.sm },

  kinds: { gap: spacing.sm },
  kind: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: 18, padding: spacing.lg,
  },
  kindIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  kindName: { fontFamily: "Tajawal_700Bold", fontSize: 14.5, color: colors.textPrimary },
  kindBody: { ...typography.caption, fontSize: 12, lineHeight: 19 },

  step: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  stepNum: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  stepNumText: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: colors.textOnPrimary },
  stepTitle: { ...typography.h3, fontSize: 15.5 },
  stepBody: { ...typography.bodyMuted, fontSize: 13, lineHeight: 21 },

  features: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  feature: {
    width: "48%", flexGrow: 1, backgroundColor: colors.surface, borderRadius: 16,
    padding: spacing.lg, gap: 5,
  },
  featureTitle: { fontFamily: "Tajawal_700Bold", fontSize: 13.5, color: colors.textPrimary },
  featureBody: { ...typography.caption, fontSize: 11.5, lineHeight: 18 },

  priceWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl },
  priceCard: { borderRadius: 26, padding: spacing.xl, gap: 6 },
  priceLabel: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: colors.gold },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  priceValue: { fontFamily: "Tajawal_700Bold", fontSize: 40, color: colors.textOnPrimary },
  pricePeriod: { fontFamily: "Tajawal_400Regular", fontSize: 15, color: colors.textOnPrimaryMuted },
  priceNote: { fontFamily: "Tajawal_400Regular", fontSize: 12.5, color: colors.textOnPrimaryMuted },
  priceList: { gap: spacing.sm, marginTop: spacing.lg },
  priceLine: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  priceLineText: { fontFamily: "Tajawal_400Regular", fontSize: 13, lineHeight: 21, color: colors.textOnPrimary, flex: 1 },
  priceLineOff: { color: colors.onPrimaryMuted },
  buy: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: colors.gold, borderRadius: radius.pill, paddingVertical: spacing.lg, marginTop: spacing.lg,
  },
  buyText: { fontFamily: "Tajawal_700Bold", fontSize: 15.5, color: colors.primary },
  buyNote: { fontFamily: "Tajawal_400Regular", fontSize: 11.5, lineHeight: 18, color: colors.textOnPrimaryMuted, textAlign: "center" },

  faq: { backgroundColor: colors.surface, borderRadius: 18, paddingHorizontal: spacing.lg },
  faqItem: { paddingVertical: spacing.lg, gap: 4 },
  faqDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  faqQ: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: colors.textPrimary },
  faqA: { ...typography.bodyMuted, fontSize: 13, lineHeight: 22 },

  foot: { alignItems: "center", gap: 6, paddingHorizontal: spacing.lg, paddingTop: spacing.xxl },
  footBrand: { fontFamily: "Tajawal_700Bold", fontSize: 18, color: colors.marine, letterSpacing: 1 },
  footLine: { ...typography.caption, textAlign: "center" },
  footRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  footButton: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.primary, borderRadius: radius.pill,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
  },
  footButtonText: { fontFamily: "Tajawal_500Medium", fontSize: 13.5, color: colors.textOnPrimary },
  footGhost: {
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
  },
  footGhostText: { fontFamily: "Tajawal_500Medium", fontSize: 13.5, color: colors.textPrimary },
  footFine: { ...typography.caption, fontSize: 11, marginTop: spacing.lg },

  dock: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
  },
  dockButton: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.md,
  },
  dockText: { fontFamily: "Tajawal_700Bold", fontSize: 14.5, color: colors.textOnPrimary },
  dockPrice: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: colors.textPrimary },
  pressed: { opacity: 0.85 },
}));
