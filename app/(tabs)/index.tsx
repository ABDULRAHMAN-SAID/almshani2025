import { useRef, useState } from "react";
import {
  I18nManager,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PhoneFrame } from "@/components/PhoneFrame";
import { DemoApp } from "@/components/DemoApp";
import { colors, radius, spacing, themed, typography } from "@/constants";
import { demoOf, TEMPLATES } from "@/product/templates";
import { KIND } from "@/product/kinds";
import type { Project } from "@/product/types";
import { useProjectStore } from "@/store/projectStore";

/**
 * معرض القوالب — قلبُ المنتج.
 *
 * وهو هواتفُ تُسحب لا شبكةُ بطاقات: صاحب المشروع يقرّر بما سيراه زبونه في
 * يده، والبطاقة المستطيلة تُري ألوانًا لا تطبيقًا. والسحبةُ الواحدة تُري
 * قالبًا كاملًا، فيُقارن بينها كما يُقارن بين قميصين لا بين صورتين.
 *
 * والمفتاح فوقها «بمحتوى مشروعي»: أن يرى اسمه هو وقائمته هو في كل قالبٍ
 * يمرّ عليه. وهذه اللحظة هي التي تبيع — لا الكلام عن «قوالب احترافية».
 */
/** الويب عندنا عربيٌّ من اليمين دائمًا (‎dir="rtl"‎ في `app/+html.tsx`). */
const WEB_RTL = Platform.OS === "web";

export default function Gallery() {
  const insets = useSafeAreaInsets();
  const project = useProjectStore((state) => state.project);
  const chooseTemplate = useProjectStore((state) => state.chooseTemplate);

  const [index, setIndex] = useState(() =>
    Math.max(0, TEMPLATES.findIndex((template) => template.id === project.templateId))
  );
  const named = project.name.trim().length > 0;
  const [mine, setMine] = useState(named);
  const scroller = useRef<ScrollView>(null);

  const { width, height } = useWindowDimensions();

  /**
   * حجم الهاتف يُحسب من ارتفاع الشاشة لا من عرضها وحده.
   *
   * وقد جُرّب بالعرض وحده فخرج الإطار أطولَ من الموضع المتاح، فانقطع شريط
   * التبويب أسفله — وهو أهمّ ما فيه: به يُعرف أن هذا تطبيقٌ لا صورة. فيُحسب
   * الآن من الباقي بعد الرأس والنقاط والبطاقة، ونسبةُ الإطار ٢٫١١ من عرضه.
   */
  const RESERVED = 348;
  const phoneWidth = Math.max(186, Math.min(300, width * 0.78, (height - RESERVED) / 2.106));

  /**
   * التمرير الأفقيّ وواجهةٌ عربية.
   *
   * أندرويد يعكس ترتيب صفحات التمرير الأفقيّ في الواجهة العربية: الصفحة
   * الأولى تقع في أقصى اليمين لا اليسار. فحسابُ الصفحة من الموضع مباشرةً
   * يُعطي القالب السادس حين يُعرض الأوّل. وهاتان تحوّلان بين الاثنين في
   * الاتّجاهين، فالقراءة والكتابة تمرّان بالتحويل نفسه ولا يختلفان.
   *
   * والمتصفّح ثالثٌ لا كهذا ولا كذاك: في صفحةٍ من اليمين يبدأ عدّادُ التمرير
   * من الصفر عند أوّل صفحة ثم ينزل سالبًا. فلو حُسب كما يُحسب في أندرويد
   * لخرجت صفحةٌ سالبة، ولوقفت النقاط والسهمان عن العمل في الويب وحده.
   */
  const pageOffset = (page: number) =>
    WEB_RTL ? -page * width : (I18nManager.isRTL ? TEMPLATES.length - 1 - page : page) * width;
  const pageOf = (x: number) => {
    if (WEB_RTL) return Math.round(-x / width);
    const raw = Math.round(x / width);
    return I18nManager.isRTL ? TEMPLATES.length - 1 - raw : raw;
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = pageOf(event.nativeEvent.contentOffset.x);
    if (next !== index && next >= 0 && next < TEMPLATES.length) setIndex(next);
  };

  const goTo = (page: number) => {
    const clamped = Math.min(TEMPLATES.length - 1, Math.max(0, page));
    setIndex(clamped);
    scroller.current?.scrollTo({ x: pageOffset(clamped), animated: true });
  };

  const current = TEMPLATES[index] ?? TEMPLATES[0];
  const chosen = current.id === project.templateId;

  /** محتوى المعاينة: مشروعه إن كتب اسمه واختار، وإلّا المشروع التجريبي. */
  const contentFor = (templateId: string): Project => {
    const demo = demoOf(templateId);
    if (!mine || !named) return demo;
    return {
      ...project,
      templateId,
      // ما لم يكتبه بعد يُملأ من التجريبي — واجهةٌ نصفها فارغ لا تُري شيئًا.
      tagline: project.tagline || demo.tagline,
      about: project.about || demo.about,
      offers: project.offers.length > 0 ? project.offers : demo.offers,
      hours: project.hours.length > 0 ? project.hours : demo.hours,
      address: project.address || demo.address,
      phone: project.phone || demo.phone,
    };
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.head}>
        <Text style={styles.title}>القوالب</Text>
        <View style={styles.headRow}>
          <Text style={styles.subtitle}>التطبيق يعمل داخل الهاتف — المسه وجرّبه</Text>
          <View style={styles.mineToggle}>
            <Text style={styles.mineLabel}>بمحتواي</Text>
            <Switch
              value={mine && named}
              onValueChange={(value) => {
                // من لم يكتب اسم مشروعه بعدُ لا شيء يُعرض به — فيُؤخذ إلى
                // المحرّر بدل أن يُقلب مفتاحٌ لا أثر له.
                if (!named) {
                  router.push("/(tabs)/project");
                  return;
                }
                setMine(value);
              }}
              trackColor={{ true: colors.marine, false: colors.border }}
              thumbColor={colors.surface}
            />
          </View>
        </View>
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        contentOffset={{ x: pageOffset(index), y: 0 }}
      >
        {TEMPLATES.map((template) => (
          <View key={template.id} style={[styles.page, { width }]}>
            {/* التطبيق حيٌّ داخل الإطار: يُضغط ويُمرَّر ويُحجز هنا، لا في
                شاشةٍ أخرى. ولا Pressable حوله — لو وُضع لابتلع كل لمسةٍ
                قبل أن تصل إلى ما فيه. والانتقال بين النماذج بالنقاط
                والسهمين تحته، فلا يضيع بتضارب السحب الأفقيّ والرأسي. */}
            <PhoneFrame
              width={phoneWidth}
              statusTint={template.skin.hero === "plain" ? template.skin.text : "#FFFFFF"}
            >
              <DemoApp project={contentFor(template.id)} template={template} interactive />
            </PhoneFrame>
          </View>
        ))}
      </ScrollView>

      <View style={styles.pager}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="القالب السابق"
          onPress={() => goTo(index - 1)}
          hitSlop={10}
          disabled={index === 0}
          style={[styles.arrow, index === 0 && styles.arrowOff]}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.dots}>
          {TEMPLATES.map((template, dot) => (
            <Pressable
              key={template.id}
              accessibilityRole="button"
              accessibilityLabel={`قالب ${template.name}`}
              onPress={() => goTo(dot)}
              hitSlop={8}
              style={[styles.dot, dot === index && styles.dotOn]}
            />
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="القالب التالي"
          onPress={() => goTo(index + 1)}
          hitSlop={10}
          disabled={index === TEMPLATES.length - 1}
          style={[styles.arrow, index === TEMPLATES.length - 1 && styles.arrowOff]}
        >
          <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <View style={[styles.tradeTag, { backgroundColor: `${current.skin.brand}18` }]}>
            <Ionicons
              name={KIND[current.kind].icon as keyof typeof Ionicons.glyphMap}
              size={13}
              color={current.skin.brand}
            />
            <Text style={[styles.tradeText, { color: current.skin.brand }]}>{KIND[current.kind].label}</Text>
          </View>
          <Text style={styles.name}>{current.name}</Text>
        </View>
        <Text style={styles.pitch} numberOfLines={2}>{current.pitch}</Text>

        <View style={styles.buttons}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/preview/${current.id}`)}
            style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
          >
            <Ionicons name="expand-outline" size={17} color={colors.textPrimary} />
            <Text style={styles.ghostText}>جرّبه</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              chooseTemplate(current.id);
              router.push("/(tabs)/project");
            }}
            style={({ pressed }) => [styles.pick, chosen && styles.picked, pressed && styles.pressed]}
          >
            <Ionicons
              name={chosen ? "checkmark-circle" : "color-wand-outline"}
              size={17}
              color={colors.textOnPrimary}
            />
            <Text style={styles.pickText}>{chosen ? "قالبي — عدّله" : "اختر هذا"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = themed(() => ({
  screen: { flex: 1, backgroundColor: colors.background },
  head: { paddingHorizontal: spacing.lg, marginBottom: 4, gap: 1 },
  headRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  title: { ...typography.h1, fontSize: 22 },
  subtitle: { ...typography.caption },
  mineToggle: { flexDirection: "row", alignItems: "center", gap: 6, marginStart: "auto" },
  mineLabel: { ...typography.caption, fontSize: 11 },

  page: { alignItems: "center", justifyContent: "center" },

  pager: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.lg, paddingVertical: spacing.sm },
  arrow: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  arrowOff: { opacity: 0.35 },
  dots: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.borderStrong },
  dotOn: { width: 18, backgroundColor: colors.marine },

  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: 6,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  name: { ...typography.h2, fontSize: 19 },
  tradeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  tradeText: { fontFamily: "Tajawal_500Medium", fontSize: 11.5 },
  pitch: { ...typography.bodyMuted, lineHeight: 21 },

  buttons: { flexDirection: "row", gap: spacing.sm, marginTop: 6 },
  ghost: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghostText: { fontFamily: "Tajawal_500Medium", fontSize: 13.5, color: colors.textPrimary },
  pick: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  picked: { backgroundColor: colors.success },
  pickText: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: colors.textOnPrimary },
  pressed: { opacity: 0.85 },
}));
