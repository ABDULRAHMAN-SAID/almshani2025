import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SitePreview } from "@/components/SitePreview";
import { colors, radius, spacing, themed } from "@/constants";
import { TEMPLATE_BY_ID, TEMPLATES, demoOf } from "@/product/templates";
import { useProjectStore } from "@/store/projectStore";

/**
 * معاينةٌ بحجم الشاشة — بلا إطارٍ ولا حواف.
 *
 * والمعرض يُري القالب في هاتفٍ صغير ليُقارَن، وهذه تُريه في يده ليُجرَّب:
 * يضغط زرّ الواتساب فيُفتح، ويمرّر القائمة فتمرّ. وما لا يُلمس لا يُشترى.
 */
export default function Preview() {
  const insets = useSafeAreaInsets();
  const { id, mine } = useLocalSearchParams<{ id: string; mine?: string }>();
  const { project, chooseTemplate } = useProjectStore();

  const template = TEMPLATE_BY_ID[String(id)] ?? TEMPLATES[0];
  const demo = demoOf(template.id);
  const useMine = mine === "1" || project.name.trim().length > 0;

  const shown = useMine
    ? {
        ...project,
        templateId: template.id,
        name: project.name || demo.name,
        tagline: project.tagline || demo.tagline,
        about: project.about || demo.about,
        offers: project.offers.length > 0 ? project.offers : demo.offers,
        hours: project.hours.length > 0 ? project.hours : demo.hours,
        address: project.address || demo.address,
        phone: project.phone || demo.phone,
        whatsapp: project.whatsapp || demo.whatsapp,
      }
    : demo;

  const chosen = template.id === project.templateId;

  return (
    <View style={styles.screen}>
      <SitePreview project={shown} template={template} interactive />

      {/* شريطٌ عائم: الخروج والاختيار بلا أن يحجبا الواجهة. */}
      <View style={[styles.top, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="رجوع"
          onPress={() => router.back()}
          style={styles.round}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{`قالب ${template.name}`}</Text>
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            chooseTemplate(template.id);
            router.replace("/(tabs)/project");
          }}
          style={({ pressed }) => [styles.pick, chosen && styles.picked, pressed && styles.pressed]}
        >
          <Ionicons
            name={chosen ? "checkmark-circle" : "color-wand-outline"}
            size={18}
            color={colors.textOnPrimary}
          />
          <Text style={styles.pickText}>{chosen ? "قالبي — عدّل محتواه" : "اختر هذا القالب"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = themed(() => ({
  screen: { flex: 1, backgroundColor: colors.background },
  top: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  round: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  badge: {
    paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  badgeText: { fontFamily: "Tajawal_500Medium", fontSize: 12.5, color: colors.textPrimary },
  bottom: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: 0 },
  pick: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.lg,
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  picked: { backgroundColor: colors.success },
  pickText: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: colors.textOnPrimary },
  pressed: { opacity: 0.88 },
}));
