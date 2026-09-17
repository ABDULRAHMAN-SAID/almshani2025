import { Fragment } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { arabicDigits, monogram, omr, whatsappLink } from "@/product/format";
import { TRADE } from "@/product/trades";
import type { Project, Template } from "@/product/types";

/**
 * واجهةُ المشروع كما يراها زبونه.
 *
 * وهي مكوّنٌ واحد لا ستّة: الفرق بين القوالب بياناتٌ في skin — لونٌ وانحناءٌ
 * وشكلُ صدرٍ وترتيبُ عروض — لا شفرةٌ مكرّرة. ولو كُتب لكل قالبٍ ملفّ لصار
 * إصلاحُ خطأ في الأسعار ستّة إصلاحات، ولتباعدت القوالب مع الوقت حتى لا
 * يُعرف أيّها الأصل.
 *
 * ويُعرض في موضعين: مصغَّرًا داخل إطار الهاتف في المعرض، وبحجمه الكامل في
 * المعاينة. وهو هو في الحالين — فما يراه الزبون في المعرض هو ما يحصل عليه.
 */

interface SitePreviewProps {
  project: Project;
  template: Template;
  /** في المعرض لا يُمرَّر ولا يُضغط: صورةٌ حيّة لا تطبيقٌ داخل تطبيق. */
  interactive?: boolean;
}

export function SitePreview({ project, template, interactive = false }: SitePreviewProps) {
  const skin = template.skin;
  const brand = project.brand ?? skin.brand;
  const trade = TRADE[project.trade];
  const Body = interactive ? ScrollView : View;

  const call = () => void Linking.openURL(`tel:${project.phone}`).catch(() => undefined);
  const chat = () => void Linking.openURL(whatsappLink(project.whatsapp, project.name)).catch(() => undefined);
  const map = () =>
    void Linking.openURL(
      `https://maps.google.com/?q=${encodeURIComponent(`${project.name} ${project.address}`)}`
    ).catch(() => undefined);

  return (
    <View style={[styles.page, { backgroundColor: skin.paper }]}>
      <Body
        style={styles.body}
        contentContainerStyle={interactive ? styles.bodyContent : undefined}
        showsVerticalScrollIndicator={false}
        scrollEnabled={interactive}
      >
        {/* ——— الصدر ——— */}
        {skin.hero === "plain" ? (
          <View style={[styles.heroPlain, { backgroundColor: skin.card }]}>
            <View style={[styles.mark, { backgroundColor: brand, borderRadius: skin.radius }]}>
              <Text style={styles.markText}>{monogram(project.name)}</Text>
            </View>
            <Text style={[styles.plainName, { color: skin.text }]}>{project.name}</Text>
            <Text style={[styles.plainTagline, { color: skin.muted }]}>{project.tagline}</Text>
            <View style={[styles.rule, { backgroundColor: brand }]} />
          </View>
        ) : (
          <LinearGradient
            colors={skin.hero === "photo" ? [brand, skin.brandDeep, "#0D0A08"] : [brand, skin.brandDeep]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.hero}
          >
            {/* زخرفةٌ مجرّدة مكان الصورة: صاحب المشروع لم يرفع صورته بعد،
                وصندوقٌ فارغ يُقرأ عطلًا لا «مكانَ صورة». */}
            <View style={styles.heroArt} pointerEvents="none">
              <View style={[styles.arc, { width: 240, height: 240, top: -90, start: -60 }]} />
              <View style={[styles.arc, { width: 150, height: 150, top: 40, start: 250 }]} />
              <View style={[styles.arc, { width: 90, height: 90, top: 150, start: 120, opacity: 0.1 }]} />
            </View>

            <View style={styles.heroFoot}>
              <View style={[styles.markSmall, { borderRadius: skin.radius }]}>
                <Text style={styles.markSmallText}>{monogram(project.name)}</Text>
              </View>
              <Text style={styles.heroName}>{project.name}</Text>
              <Text style={styles.heroTagline}>{project.tagline}</Text>
            </View>
          </LinearGradient>
        )}

        {/* ——— أزرار الفعل ———
            واتساب أوّلها عمدًا: المشاريع الصغيرة في السلطنة تُدار بالواتساب،
            ورقمٌ يُنسخ يدويًّا يُفقد نصفَ من همّ بالطلب. */}
        <View style={[styles.actions, { marginTop: skin.hero === "plain" ? 0 : -22 }]}>
          <Action
            icon="logo-whatsapp"
            label="واتساب"
            tint="#FFFFFF"
            background="#1FA855"
            radius={skin.radius}
            onPress={chat}
            enabled={interactive}
          />
          <Action
            icon="call"
            label={trade.actionLabel}
            tint="#FFFFFF"
            background={brand}
            radius={skin.radius}
            onPress={call}
            enabled={interactive}
          />
          <Action
            icon="location"
            label="الموقع"
            tint={skin.text}
            background={skin.card}
            radius={skin.radius}
            onPress={map}
            enabled={interactive}
          />
        </View>

        {/* ——— العروض ——— */}
        <Section title={trade.offerLabel} skin={skin} brand={brand}>
          {skin.offerLayout === "grid" ? (
            <View style={styles.grid}>
              {project.offers.map((offer) => (
                <View key={offer.id} style={[styles.tile, { backgroundColor: skin.card, borderRadius: skin.radius }]}>
                  {/* أيقونةُ النشاط لا حرفان من اسم الصنف: «لح» من «لبان
                      حوجري» تُقرأ خطأً مطبعيًّا لا شعارًا. */}
                  <View style={[styles.tileArt, { backgroundColor: `${brand}14`, borderRadius: skin.radius - 4 }]}>
                    <Ionicons
                      name={trade.icon as keyof typeof Ionicons.glyphMap}
                      size={26}
                      color={`${brand}88`}
                    />
                  </View>
                  <Text style={[styles.tileName, { color: skin.text }]} numberOfLines={1}>
                    {offer.name}
                  </Text>
                  <Text style={[styles.tilePrice, { color: brand }]}>{omr(offer.price)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.list, { backgroundColor: skin.card, borderRadius: skin.radius }]}>
              {project.offers.map((offer, index) => (
                <Fragment key={offer.id}>
                  {index > 0 ? <View style={[styles.divider, { backgroundColor: `${skin.muted}22` }]} /> : null}
                  <View style={styles.row}>
                    <View style={styles.rowText}>
                      <Text style={[styles.rowName, { color: skin.text }]}>{offer.name}</Text>
                      {offer.note ? <Text style={[styles.rowNote, { color: skin.muted }]}>{offer.note}</Text> : null}
                    </View>
                    <Text style={[styles.rowPrice, { color: brand }]}>{omr(offer.price)}</Text>
                  </View>
                </Fragment>
              ))}
            </View>
          )}
        </Section>

        {/* ——— أوقات العمل ——— */}
        <Section title="أوقات العمل" skin={skin} brand={brand}>
          <View style={[styles.list, { backgroundColor: skin.card, borderRadius: skin.radius }]}>
            {project.hours.map((entry, index) => (
              <Fragment key={entry.days}>
                {index > 0 ? <View style={[styles.divider, { backgroundColor: `${skin.muted}22` }]} /> : null}
                <View style={styles.row}>
                  <Text style={[styles.rowName, { color: skin.text }]}>{entry.days}</Text>
                  <Text style={[styles.rowHours, { color: skin.muted }]}>{entry.hours}</Text>
                </View>
              </Fragment>
            ))}
          </View>
        </Section>

        {/* ——— عن المشروع ——— */}
        <Section title="عن المشروع" skin={skin} brand={brand}>
          <Text style={[styles.about, { color: skin.muted }]}>{project.about}</Text>
        </Section>

        {/* ——— التواصل ——— */}
        <Section title="التواصل" skin={skin} brand={brand}>
          <View style={[styles.list, { backgroundColor: skin.card, borderRadius: skin.radius }]}>
            <Line icon="call-outline" text={arabicDigits(project.phone)} skin={skin} brand={brand} />
            <View style={[styles.divider, { backgroundColor: `${skin.muted}22` }]} />
            <Line icon="location-outline" text={project.address} skin={skin} brand={brand} />
            {project.instagram ? (
              <>
                <View style={[styles.divider, { backgroundColor: `${skin.muted}22` }]} />
                <Line icon="logo-instagram" text={`@${project.instagram}`} skin={skin} brand={brand} />
              </>
            ) : null}
          </View>
        </Section>

        {/* التوقيع: كلّ واجهةٍ تحمل اسم المنصّة — وهو أرخص تسويقٍ وأصدقه. */}
        <View style={styles.signature}>
          <Text style={[styles.signatureText, { color: skin.muted }]}>صُنع بـ واجهة</Text>
        </View>
      </Body>
    </View>
  );
}

function Action({
  icon, label, tint, background, radius, onPress, enabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint: string;
  background: string;
  radius: number;
  onPress: () => void;
  enabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={enabled ? onPress : undefined}
      style={[styles.action, { backgroundColor: background, borderRadius: radius }]}
    >
      <Ionicons name={icon} size={17} color={tint} />
      <Text style={[styles.actionLabel, { color: tint }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function Section({
  title, skin, brand, children,
}: {
  title: string;
  skin: Template["skin"];
  brand: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={[styles.sectionTick, { backgroundColor: brand }]} />
        <Text style={[styles.sectionTitle, { color: skin.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Line({
  icon, text, skin, brand,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  skin: Template["skin"];
  brand: string;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={brand} />
      <Text style={[styles.rowName, { color: skin.text, flex: 1 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  body: { flex: 1 },
  bodyContent: { paddingBottom: 32 },

  hero: { height: 230, justifyContent: "flex-end", overflow: "hidden" },
  heroArt: { ...StyleSheet.absoluteFillObject },
  arc: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.07)" },
  heroFoot: { paddingHorizontal: 20, paddingBottom: 38, gap: 6 },
  markSmall: {
    width: 46, height: 46, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)", marginBottom: 4,
  },
  markSmallText: { fontFamily: "Tajawal_700Bold", fontSize: 18, color: "#FFFFFF" },
  heroName: { fontFamily: "Tajawal_700Bold", fontSize: 26, color: "#FFFFFF" },
  heroTagline: { fontFamily: "Tajawal_400Regular", fontSize: 13.5, color: "rgba(255,255,255,0.82)" },

  heroPlain: { paddingHorizontal: 20, paddingTop: 58, paddingBottom: 22, alignItems: "center", gap: 6 },
  mark: { width: 54, height: 54, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  markText: { fontFamily: "Tajawal_700Bold", fontSize: 21, color: "#FFFFFF" },
  plainName: { fontFamily: "Tajawal_700Bold", fontSize: 24 },
  plainTagline: { fontFamily: "Tajawal_400Regular", fontSize: 13 },
  rule: { width: 46, height: 3, borderRadius: 2, marginTop: 10 },

  actions: { flexDirection: "row", gap: 8, paddingHorizontal: 16 },
  action: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 12,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  actionLabel: { fontFamily: "Tajawal_500Medium", fontSize: 12.5 },

  section: { paddingHorizontal: 16, marginTop: 22, gap: 10 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 7 },
  sectionTick: { width: 4, height: 16, borderRadius: 2 },
  sectionTitle: { fontFamily: "Tajawal_700Bold", fontSize: 16 },

  list: { paddingHorizontal: 14, paddingVertical: 4 },
  divider: { height: StyleSheet.hairlineWidth },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11 },
  rowText: { flex: 1, gap: 1 },
  rowName: { fontFamily: "Tajawal_500Medium", fontSize: 14 },
  rowNote: { fontFamily: "Tajawal_400Regular", fontSize: 11.5 },
  rowPrice: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  rowHours: { fontFamily: "Tajawal_400Regular", fontSize: 13 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: (390 - 32 - 10) / 2, padding: 10, gap: 6 },
  tileArt: { height: 78, alignItems: "center", justifyContent: "center" },
  tileMark: { fontFamily: "Tajawal_700Bold", fontSize: 22 },
  tileName: { fontFamily: "Tajawal_500Medium", fontSize: 13 },
  tilePrice: { fontFamily: "Tajawal_700Bold", fontSize: 13 },

  about: { fontFamily: "Tajawal_400Regular", fontSize: 13.5, lineHeight: 23 },

  signature: { alignItems: "center", marginTop: 26, paddingBottom: 8 },
  signatureText: { fontFamily: "Tajawal_400Regular", fontSize: 11, letterSpacing: 0.4 },
});
