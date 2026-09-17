import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CompareTable } from "@/components/CompareTable";
import { QrCode } from "@/components/QrCode";
import { TierCards } from "@/components/TierCards";
import { colors, radius, spacing, themed, typography } from "@/constants";
import { ADDONS, DELIVERY, PAYMENT_NOTE, PROMISES, SALES_WHATSAPP, subscribeText, type Tier } from "@/product/plan";
import { arabicDigits } from "@/product/format";
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

  const choose = (tier: Tier) => {
    const text = encodeURIComponent(subscribeText(tier, project.name || undefined));
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

      {/* ——— الباقات ——— */}
      <Text style={styles.heading}>اختر باقتك</Text>
      <TierCards onChoose={choose} />

      {/* ——— المقارنة ——— */}
      <Text style={styles.heading}>الفرق بينها</Text>
      <CompareTable />
      <Text style={styles.fine}>
        الترقية متاحةٌ في أيّ وقت، ولا تدفع إلا فرق السعر عن الأشهر المتبقّية.
      </Text>

      {/* ——— بعد الطلب ——— */}
      <Text style={styles.heading}>ماذا يحدث بعد أن تطلب</Text>
      <View style={styles.card}>
        {DELIVERY.map((step, index) => (
          <View key={step.title} style={[styles.tlRow, index > 0 && styles.tlDivider]}>
            <View style={styles.tlDot}>
              <Text style={styles.tlDotText}>{arabicDigits(index + 1)}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.tlTitle}>{step.title}</Text>
              <Text style={styles.tlNote}>{step.body}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* ——— إضافات ——— */}
      <Text style={styles.heading}>إضافاتٌ تُطلب وحدها</Text>
      <View style={styles.card}>
        {ADDONS.map((addon, index) => (
          <View key={addon.name} style={[styles.addon, index > 0 && styles.tlDivider]}>
            <Ionicons name={addon.icon as keyof typeof Ionicons.glyphMap} size={19} color={colors.marine} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.addonHead}>
                <Text style={styles.addonName}>{addon.name}</Text>
                <Text style={styles.addonPrice}>{addon.price}</Text>
              </View>
              <Text style={styles.addonNote}>{addon.note}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* ——— ما نلتزم به ——— */}
      <Text style={styles.heading}>بم نلتزم لك</Text>
      <View style={{ gap: spacing.sm }}>
        {PROMISES.map((promise) => (
          <View key={promise.title} style={styles.promise}>
            <Ionicons name={promise.icon as keyof typeof Ionicons.glyphMap} size={19} color={colors.success} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.promiseTitle}>{promise.title}</Text>
              <Text style={styles.promiseBody}>{promise.body}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.payNote}>{PAYMENT_NOTE}</Text>

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
  heading: { ...typography.h2, fontSize: 18, marginTop: spacing.sm },
  fine: { ...typography.caption, fontSize: 11.5, textAlign: "center", marginTop: -spacing.sm },

  state: { borderRadius: 22, padding: spacing.xl, alignItems: "center", gap: 6 },
  stateTitle: { fontFamily: "Tajawal_700Bold", fontSize: 20, color: colors.textOnPrimary },
  stateNote: { ...typography.caption, color: colors.textOnPrimaryMuted, textAlign: "center", lineHeight: 20 },

  card: { backgroundColor: colors.surface, borderRadius: 18, paddingHorizontal: spacing.lg },

  tlRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, paddingVertical: spacing.lg },
  tlDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  tlDot: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.marine,
    alignItems: "center", justifyContent: "center",
  },
  tlDotText: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: colors.textOnPrimary },
  tlTitle: { ...typography.h3, fontSize: 14.5 },
  tlNote: { ...typography.bodyMuted, fontSize: 12.5, lineHeight: 20 },

  addon: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, paddingVertical: spacing.lg },
  addonHead: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  addonName: { fontFamily: "Tajawal_700Bold", fontSize: 13.5, color: colors.textPrimary, flex: 1 },
  addonPrice: { fontFamily: "Tajawal_700Bold", fontSize: 12, color: colors.marine },
  addonNote: { ...typography.caption, fontSize: 11.5, lineHeight: 18 },

  promise: {
    flexDirection: "row", alignItems: "flex-start", gap: spacing.md,
    backgroundColor: colors.successSoft, borderRadius: 16, padding: spacing.lg,
  },
  promiseTitle: { fontFamily: "Tajawal_700Bold", fontSize: 13.5, color: colors.textPrimary },
  promiseBody: { ...typography.caption, fontSize: 11.5, lineHeight: 18 },
  payNote: { ...typography.caption, fontSize: 11.5, lineHeight: 19, textAlign: "center" },

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
