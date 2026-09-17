import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PhoneFrame } from "@/components/PhoneFrame";
import { DemoApp } from "@/components/DemoApp";
import { colors, radius, spacing, themed, typography } from "@/constants";
import { TEMPLATE_BY_ID, TEMPLATES, demoOf } from "@/product/templates";
import { KINDS, KIND } from "@/product/kinds";
import type { Offer } from "@/product/types";
import { useProjectStore } from "@/store/projectStore";

/** ألوانٌ جاهزة — أكثرها يربك، وأقلّها يحبس. ستّةٌ تكفي. */
const SWATCHES = ["#8C3B1E", "#6C4E8F", "#186B77", "#1F5C42", "#B26A12", "#243B6B"];

/**
 * محرّر المشروع — والمعاينة فوقه لا بعده.
 *
 * وصاحب المشروع لا يقرأ «حقولًا»، إنما يرى أثر ما كتب. فالهاتف في الصدر
 * يتغيّر مع كل حرف: يكتب اسمه فيراه في واجهته قبل أن يرفع إصبعه. وهذا وحده
 * يجعله يكمل النموذج بدل أن يتركه.
 */
export default function Editor() {
  const insets = useSafeAreaInsets();
  const { project, patch, chooseTemplate, setOffers } = useProjectStore();
  const template = TEMPLATE_BY_ID[project.templateId] ?? TEMPLATES[0];
  const demo = demoOf(project.templateId);
  const [showAll, setShowAll] = useState(false);

  const shown = {
    ...project,
    name: project.name || "اسم مشروعك",
    tagline: project.tagline || demo.tagline,
    about: project.about || demo.about,
    offers: project.offers.length > 0 ? project.offers : demo.offers,
    hours: project.hours.length > 0 ? project.hours : demo.hours,
    address: project.address || demo.address,
    phone: project.phone || demo.phone,
  };

  const editOffer = (id: string, change: Partial<Offer>) =>
    setOffers(project.offers.map((offer) => (offer.id === id ? { ...offer, ...change } : offer)));

  const addOffer = () =>
    setOffers([...project.offers, { id: `o${Date.now()}`, name: "", price: 0 }]);

  const removeOffer = (id: string) => setOffers(project.offers.filter((offer) => offer.id !== id));

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.previewWrap}>
        <PhoneFrame
          width={150}
          statusTint={template.skin.hero === "plain" ? template.skin.text : "#FFFFFF"}
        >
          <DemoApp project={shown} template={template} />
        </PhoneFrame>
        <View style={styles.previewSide}>
          <Text style={styles.title}>مشروعي</Text>
          <Text style={styles.subtitle}>كلّ ما تكتبه يظهر في الهاتف فورًا.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/preview/${template.id}?mine=1`)}
            style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}
          >
            <Ionicons name="expand-outline" size={15} color={colors.textOnPrimary} />
            <Text style={styles.smallButtonText}>معاينة كاملة</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(tabs)")}
            style={({ pressed }) => [styles.smallGhost, pressed && styles.pressed]}
          >
            <Ionicons name="color-wand-outline" size={15} color={colors.textPrimary} />
            <Text style={styles.smallGhostText}>بدّل القالب</Text>
          </Pressable>
        </View>
      </View>

      <Label text="نوع التطبيق" />
      <View style={styles.chips}>
        {KINDS.map((kind) => {
          // لكل نوعٍ قالبُه: اختيارُ النوع اختيارُ شاشاتٍ لا لون.
          const template = TEMPLATES.find((item) => item.kind === kind.key);
          const on = kind.key === project.kind;
          return (
            <Pressable
              key={kind.key}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => template && chooseTemplate(template.id)}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Ionicons
                name={kind.icon as keyof typeof Ionicons.glyphMap}
                size={14}
                color={on ? colors.textOnPrimary : colors.textSecondary}
              />
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{kind.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Label text="الاسم والتعريف" />
      <Field value={project.name} onChange={(name) => patch({ name })} placeholder="اسم المشروع" />
      <Field
        value={project.tagline}
        onChange={(tagline) => patch({ tagline })}
        placeholder="سطرٌ يعرّف بمشروعك"
      />
      <Field
        value={project.about}
        onChange={(about) => patch({ about })}
        placeholder="نبذة: ماذا تقدّم، ولمن، وما يميّزك"
        multiline
      />

      <Label text="لون الهوية" />
      <View style={styles.swatches}>
        <Pressable
          accessibilityRole="button"
          onPress={() => patch({ brand: undefined })}
          style={[styles.swatch, styles.swatchAuto, !project.brand && styles.swatchOn]}
        >
          <Text style={styles.swatchAutoText}>لون القالب</Text>
        </Pressable>
        {SWATCHES.map((color) => (
          <Pressable
            key={color}
            accessibilityRole="button"
            accessibilityLabel={`لون ${color}`}
            onPress={() => patch({ brand: color })}
            style={[styles.swatch, { backgroundColor: color }, project.brand === color && styles.swatchOn]}
          />
        ))}
      </View>

      <Label text={KIND[project.kind].offerLabel} />
      <View style={styles.offers}>
        {(project.offers.length > 0 ? project.offers : demo.offers).map((offer, index) => {
          const own = project.offers.length > 0;
          return (
            <View key={offer.id} style={styles.offerRow}>
              <TextInput
                value={offer.name}
                onChangeText={(name) => (own ? editOffer(offer.id, { name }) : setOffers(demo.offers.map((item, i) => (i === index ? { ...item, name } : item))))}
                placeholder="الصنف أو الخدمة"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.offerName]}
              />
              <TextInput
                value={offer.price > 0 ? String(offer.price) : ""}
                onChangeText={(text) => {
                  const price = Number(text.replace(/[^\d.]/g, "")) || 0;
                  if (own) editOffer(offer.id, { price });
                  else setOffers(demo.offers.map((item, i) => (i === index ? { ...item, price } : item)));
                }}
                placeholder="٠"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                style={[styles.input, styles.offerPrice]}
              />
              {own ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="احذف"
                  onPress={() => removeOffer(offer.id)}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
          );
        })}
        <Pressable
          accessibilityRole="button"
          onPress={() => (project.offers.length > 0 ? addOffer() : setOffers([...demo.offers, { id: `o${Date.now()}`, name: "", price: 0 }]))}
          style={({ pressed }) => [styles.addRow, pressed && styles.pressed]}
        >
          <Ionicons name="add-circle-outline" size={18} color={colors.marine} />
          <Text style={styles.addText}>أضف صنفًا</Text>
        </Pressable>
      </View>

      <Label text="التواصل" />
      <Field value={project.phone} onChange={(phone) => patch({ phone })} placeholder="رقم الهاتف" numeric />
      <Field
        value={project.whatsapp}
        onChange={(whatsapp) => patch({ whatsapp })}
        placeholder="واتساب بمفتاح الدولة — ٩٦٨…"
        numeric
      />
      <Field value={project.address} onChange={(address) => patch({ address })} placeholder="الولاية والحيّ" />

      {showAll ? (
        <Field
          value={project.instagram ?? ""}
          onChange={(instagram) => patch({ instagram })}
          placeholder="حساب إنستقرام بلا @"
        />
      ) : (
        <Pressable accessibilityRole="button" onPress={() => setShowAll(true)} style={styles.more}>
          <Ionicons name="chevron-down" size={15} color={colors.marine} />
          <Text style={styles.moreText}>حقولٌ إضافية</Text>
        </Pressable>
      )}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/(tabs)/plan")}
        style={({ pressed }) => [styles.publish, pressed && styles.pressed]}
      >
        <Ionicons name="rocket-outline" size={18} color={colors.primary} />
        <Text style={styles.publishText}>انشر واجهتك</Text>
      </Pressable>

      <Text style={styles.footNote}>
        {`رابطك سيكون: wajha.om/${project.slug || "اسم-مشروعك"} — ويمكن تغييره قبل النشر.`}
      </Text>
    </ScrollView>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

function Field({
  value, onChange, placeholder, multiline, numeric,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  numeric?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      multiline={multiline}
      keyboardType={numeric ? "phone-pad" : "default"}
      style={[styles.input, multiline && styles.inputTall]}
    />
  );
}

const styles = themed(() => ({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },

  previewWrap: { flexDirection: "row", alignItems: "center", gap: spacing.lg, marginBottom: spacing.md },
  previewSide: { flex: 1, gap: spacing.sm },
  title: { ...typography.h1, fontSize: 22 },
  subtitle: { ...typography.caption, lineHeight: 19 },
  smallButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 9,
  },
  smallButtonText: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: colors.textOnPrimary },
  smallGhost: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderRadius: radius.pill, paddingVertical: 9, borderWidth: 1, borderColor: colors.border,
  },
  smallGhostText: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: colors.textPrimary },

  label: { ...typography.h3, fontSize: 15, marginTop: spacing.lg },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: "Tajawal_400Regular",
    fontSize: 14.5,
    color: colors.textPrimary,
    textAlign: "right",
  },
  inputTall: { minHeight: 92, textAlignVertical: "top" },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: "Tajawal_500Medium", fontSize: 12.5, color: colors.textSecondary },
  chipTextOn: { color: colors.textOnPrimary },

  swatches: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center" },
  swatch: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: "transparent" },
  swatchOn: { borderColor: colors.textPrimary },
  swatchAuto: {
    width: "auto", paddingHorizontal: spacing.md, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surface, borderRadius: radius.pill,
  },
  swatchAutoText: { fontFamily: "Tajawal_500Medium", fontSize: 12, color: colors.textSecondary },

  offers: { gap: spacing.sm },
  offerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  offerName: { flex: 1 },
  offerPrice: { width: 86, textAlign: "center" },
  addRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: spacing.sm },
  addText: { fontFamily: "Tajawal_500Medium", fontSize: 13.5, color: colors.marine },

  more: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: spacing.sm },
  moreText: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: colors.marine },

  publish: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: colors.gold, borderRadius: radius.pill, paddingVertical: spacing.lg,
    marginTop: spacing.xl,
  },
  publishText: { fontFamily: "Tajawal_700Bold", fontSize: 15.5, color: colors.primary },
  footNote: { ...typography.caption, textAlign: "center", marginTop: spacing.sm },
  pressed: { opacity: 0.85 },
}));
