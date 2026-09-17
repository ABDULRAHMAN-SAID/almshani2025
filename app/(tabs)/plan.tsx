import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { QrCode } from "@/components/QrCode";
import { colors, radius, spacing, themed, typography } from "@/constants";
import { arabicDigits } from "@/product/format";
import { INCLUDED, NOT_INCLUDED, PERIOD_LABEL, PRICE_LABEL, PRICE_OMR, SALES_WHATSAPP } from "@/product/plan";
import { useProjectStore } from "@/store/projectStore";

/**
 * الاشتراك.
 *
 * ولا عدّادَ ولا تجربةٌ تنتهي: النماذج الستّة تُفتح وتُجرَّب مجانًا وبلا
 * حساب وبلا حدّ. والدفعُ ثمنُ **تطبيقك أنت** منشورًا برابطك واسمك — لا ثمنُ
 * إذنٍ بالنظر. ومن رأى ما يشتريه قبل أن يدفع، دفع مطمئنًّا ولم يطلب استرجاعًا.
 */
export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const { project, publish } = useProjectStore();
  const link = `wajha.om/${project.slug || "اسم-مشروعك"}`;

  const subscribe = () => {
    const text = encodeURIComponent(
      `السلام عليكم، أريد الاشتراك في واجهة (${PRICE_OMR} ر.ع. للسنة) لمشروع: ${project.name || "—"}`
    );
    void Linking.openURL(`https://wa.me/${SALES_WHATSAPP}?text=${text}`).catch(() => undefined);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>الاشتراك</Text>

      {/* ——— ما تدفع من أجله ——— */}
      <LinearGradient
        colors={[colors.primaryLight, colors.primary]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.state}
      >
        <Ionicons name="eye-outline" size={26} color={colors.gold} />
        <Text style={styles.stateTitle}>شاهد وجرّب — ثم ادفع</Text>
        <Text style={styles.stateNote}>
          النماذج الستّة مفتوحة لك مجانًا وبلا حساب: احجز فيها، واملأ السلّة،
          وافتح الدروس. والدفع ثمنُ تطبيقك أنت منشورًا باسمك ورابطك.
        </Text>
      </LinearGradient>

      {/* ——— السعر ——— */}
      <View style={styles.price}>
        <View style={styles.priceHead}>
          <Text style={styles.priceValue}>{PRICE_LABEL}</Text>
          <Text style={styles.pricePeriod}>{PERIOD_LABEL}</Text>
        </View>
        <Text style={styles.priceNote}>
          {`أقلّ من ${arabicDigits((PRICE_OMR / 12).toFixed(1))} ر.ع. في الشهر — ثمنُ فنجانَي قهوة.`}
        </Text>

        <View style={styles.listBlock}>
          {INCLUDED.map((line) => (
            <View key={line} style={styles.line}>
              <Ionicons name="checkmark-circle" size={17} color={colors.success} />
              <Text style={styles.lineText}>{line}</Text>
            </View>
          ))}
          {NOT_INCLUDED.map((line) => (
            <View key={line} style={styles.line}>
              <Ionicons name="remove-circle-outline" size={17} color={colors.textMuted} />
              <Text style={[styles.lineText, styles.lineOff]}>{line}</Text>
            </View>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={subscribe}
          style={({ pressed }) => [styles.subscribe, pressed && styles.pressed]}
        >
          <Ionicons name="logo-whatsapp" size={18} color={colors.primary} />
          <Text style={styles.subscribeText}>اشترك الآن</Text>
        </Pressable>
        <Text style={styles.payNote}>
          الدفع بالتحويل أو عند المندوب، وبوابة الدفع الإلكتروني قيد الربط.
          ولا يُطلب منك شيء قبل أن ترى تطبيقك جاهزًا باسمك.
        </Text>
      </View>

      {/* ——— رمز المحل ——— */}
      <View style={styles.qrCard}>
        <View style={styles.qrText}>
          <Text style={styles.qrTitle}>رمزٌ يُعلَّق في المحل</Text>
          <Text style={styles.qrNote}>
            يوجّهه الزبون بكاميرته فتُفتح واجهتك — بلا تحميلٍ ولا بحث.
          </Text>
          <Text style={styles.qrLink}>{link}</Text>
        </View>
        <QrCode value={`https://${link}`} size={104} />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={publish}
        style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
      >
        <Ionicons name="rocket-outline" size={17} color={colors.textPrimary} />
        <Text style={styles.ghostText}>
          {project.publishedAt ? "منشورة — حدّثها" : "انشر الآن"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = themed(() => ({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  title: { ...typography.h1, fontSize: 22 },

  state: { borderRadius: 22, padding: spacing.xl, alignItems: "center", gap: 6 },
  stateTitle: { fontFamily: "Tajawal_700Bold", fontSize: 20, color: colors.textOnPrimary },
  stateNote: { ...typography.caption, color: colors.textOnPrimaryMuted, textAlign: "center", lineHeight: 20 },
  stateButton: {
    backgroundColor: colors.gold, borderRadius: radius.pill,
    paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, marginTop: spacing.sm,
  },
  stateButtonText: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: colors.primary },

  price: { backgroundColor: colors.surface, borderRadius: 22, padding: spacing.xl, gap: spacing.sm },
  priceHead: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  priceValue: { fontFamily: "Tajawal_700Bold", fontSize: 34, color: colors.textPrimary },
  pricePeriod: { ...typography.body, color: colors.textMuted },
  priceNote: { ...typography.caption },
  listBlock: { gap: spacing.sm, marginTop: spacing.md },
  line: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  lineText: { ...typography.body, fontSize: 13.5, flex: 1, lineHeight: 21 },
  lineOff: { color: colors.textMuted },
  subscribe: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: colors.gold, borderRadius: radius.pill, paddingVertical: spacing.lg,
    marginTop: spacing.md,
  },
  subscribeText: { fontFamily: "Tajawal_700Bold", fontSize: 15.5, color: colors.primary },
  payNote: { ...typography.caption, fontSize: 11.5, textAlign: "center", lineHeight: 18 },

  qrCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.lg,
    backgroundColor: colors.surface, borderRadius: 22, padding: spacing.lg,
  },
  qrText: { flex: 1, gap: 3 },
  qrTitle: { ...typography.h3, fontSize: 15 },
  qrNote: { ...typography.caption, lineHeight: 19 },
  qrLink: { fontFamily: "Tajawal_700Bold", fontSize: 12.5, color: colors.marine, writingDirection: "ltr" },

  ghost: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderRadius: radius.pill, paddingVertical: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  ghostText: { fontFamily: "Tajawal_500Medium", fontSize: 14, color: colors.textPrimary },
  pressed: { opacity: 0.85 },
}));
