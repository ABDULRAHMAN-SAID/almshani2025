import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, spacing, themed, typography } from "@/constants";
import { monthlyLabel, PERIOD_LABEL, priceLabel, TIERS, type Tier } from "@/product/plan";

/**
 * الباقات الثلاث، بطاقةً بطاقة.
 *
 * وترتيبُها من الأرخص ليس مصادفةً: من رأى الرخيص أوّلًا قاسَ عليه، ومن رأى
 * الغالي أوّلًا أُرعِب فأغلق. والوسطى مُبرَزةٌ لأنها هي المقصودة — لا حيلةً،
 * بل لأن أكثر المحلّات تحتاج نطاقها وصورَها فعلًا.
 */
export function TierCards({ onChoose }: { onChoose: (tier: Tier) => void }) {
  return (
    <View style={styles.wrap}>
      {TIERS.map((tier) => (tier.featured ? (
        <LinearGradient
          key={tier.id}
          colors={[colors.primaryLight, colors.primary, colors.primaryDark]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <TierBody tier={tier} onChoose={onChoose} dark />
        </LinearGradient>
      ) : (
        <View key={tier.id} style={[styles.card, styles.plain]}>
          <TierBody tier={tier} onChoose={onChoose} />
        </View>
      )))}
    </View>
  );
}

function TierBody({ tier, onChoose, dark }: { tier: Tier; onChoose: (tier: Tier) => void; dark?: boolean }) {
  const title = dark ? styles.nameOn : styles.name;
  const body = dark ? styles.whoOn : styles.who;
  const value = dark ? styles.valueOn : styles.value;
  const period = dark ? styles.periodOn : styles.period;
  const line = dark ? styles.lineTextOn : styles.lineText;

  return (
    <>
      <View style={styles.head}>
        <Text style={title}>{`الباقة ${tier.name}`}</Text>
        {tier.badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{tier.badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={body}>{tier.who}</Text>

      <View style={styles.priceRow}>
        <Text style={value} numberOfLines={1}>{priceLabel(tier.price)}</Text>
        <Text style={period}>{PERIOD_LABEL}</Text>
      </View>
      <Text style={dark ? styles.monthlyOn : styles.monthly}>{`نحو ${monthlyLabel(tier.price)}`}</Text>

      {tier.over ? <Text style={dark ? styles.overOn : styles.over}>{tier.over}</Text> : null}

      <View style={styles.list}>
        {tier.features.map((feature) => (
          <View key={feature} style={styles.line}>
            <Ionicons name="checkmark-circle" size={16} color={dark ? colors.gold : colors.success} />
            <Text style={line}>{feature}</Text>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => onChoose(tier)}
        style={({ pressed }) => [dark ? styles.buyOn : styles.buy, pressed && styles.pressed]}
      >
        <Ionicons name="logo-whatsapp" size={17} color={dark ? colors.primary : colors.textOnPrimary} />
        <Text style={dark ? styles.buyTextOn : styles.buyText}>{`اختر ${tier.name}`}</Text>
      </Pressable>
    </>
  );
}

const styles = themed(() => ({
  wrap: { gap: spacing.md },
  card: { borderRadius: 24, padding: spacing.xl, gap: 4 },
  plain: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },

  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { fontFamily: "Tajawal_700Bold", fontSize: 18, color: colors.textPrimary, flex: 1 },
  nameOn: { fontFamily: "Tajawal_700Bold", fontSize: 18, color: colors.textOnPrimary, flex: 1 },
  badge: { backgroundColor: colors.gold, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 4 },
  badgeText: { fontFamily: "Tajawal_700Bold", fontSize: 11, color: colors.primary },

  who: { ...typography.caption, lineHeight: 20 },
  whoOn: { fontFamily: "Tajawal_400Regular", fontSize: 12.5, lineHeight: 20, color: colors.textOnPrimaryMuted },

  priceRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, marginTop: spacing.md },
  value: { fontFamily: "Tajawal_700Bold", fontSize: 34, color: colors.textPrimary },
  valueOn: { fontFamily: "Tajawal_700Bold", fontSize: 34, color: colors.textOnPrimary },
  period: { ...typography.body, color: colors.textMuted },
  periodOn: { fontFamily: "Tajawal_400Regular", fontSize: 14, color: colors.textOnPrimaryMuted },
  monthly: { ...typography.caption, fontSize: 11.5 },
  monthlyOn: { fontFamily: "Tajawal_400Regular", fontSize: 11.5, color: colors.textOnPrimaryMuted },

  over: { fontFamily: "Tajawal_700Bold", fontSize: 12.5, color: colors.marine, marginTop: spacing.md },
  overOn: { fontFamily: "Tajawal_700Bold", fontSize: 12.5, color: colors.gold, marginTop: spacing.md },

  list: { gap: spacing.sm, marginTop: spacing.md },
  line: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  lineText: { ...typography.body, fontSize: 13, lineHeight: 21, flex: 1 },
  lineTextOn: { fontFamily: "Tajawal_400Regular", fontSize: 13, lineHeight: 21, color: colors.textOnPrimary, flex: 1 },

  buy: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.md, marginTop: spacing.lg,
  },
  buyText: { fontFamily: "Tajawal_700Bold", fontSize: 14.5, color: colors.textOnPrimary },
  buyOn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: colors.gold, borderRadius: radius.pill, paddingVertical: spacing.md, marginTop: spacing.lg,
  },
  buyTextOn: { fontFamily: "Tajawal_700Bold", fontSize: 14.5, color: colors.primary },
  pressed: { opacity: 0.85 },
}));
