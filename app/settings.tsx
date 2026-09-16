import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, getColorScheme, radius, rememberRoute, spacing, typography, themed } from "@/constants";
import { BUILD_STAMP } from "@/services/config";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { useSettingsStore, type ThemePreference } from "@/store/settingsStore";
import { useColorScheme } from "react-native";

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "system", label: "تلقائي", icon: "phone-portrait-outline" },
  { value: "light", label: "فاتح", icon: "sunny-outline" },
  { value: "dark", label: "داكن", icon: "moon-outline" },
];

const PRIVACY_POINTS = [
  "لا يعرض التطبيق رقم هاتفك لأي مستخدم آخر",
  "لا توجد محادثات ولا رسائل خاصة بين المستخدمين",
  "لا يجمع التطبيق موقعك ولا يتتبعه",
  "لا يحفظ التطبيق رتبة ولا رقمًا عسكريًا ولا جهة عمل",
];

/**
 * إصدار النسخة المثبَّتة، لا رقمًا مكتوبًا في الشفرة.
 *
 * وقد جُرّب قبل هذا أخذُ رقم البناء من Constants.platform، فكان فارغًا في
 * نسخة الإنتاج: يظهر «0.1.0» وحده مهما تغيّرت النسخة، فلا يعرف من ثبّت ملفًّا
 * أهو الجديد أم القديم — وهو السؤال الوحيد الذي وُضع السطر من أجله.
 *
 * فالختم يُكتب في الشفرة نفسها ساعة بنائها، ويتغيّر مع كل بناء ومع كل تحديث.
 */
function installedVersion(): string {
  const name = Constants.expoConfig?.version ?? "—";
  if (!BUILD_STAMP) return name;
  // الختم يُكتب لاتينيًّا في ملفّ البيئة — الحروف العربية فيه تمرّ بأدوات
  // لا تَعِد بترميزها — ويُعرَّب هنا حيث النصّ عربيّ أصلًا.
  const [kind, ...rest] = BUILD_STAMP.split(" ");
  const when = rest.join(" ");
  const label = kind === "update" ? "تحديث" : "بناء";
  return when ? `${name} · ${label} ${when}` : name;
}

export default function SettingsScreen() {
  const { activityReminders, announcementAlerts, quizReminders, theme, toggle, setTheme } = useSettingsStore();
  const { checkNow, checking } = useAppUpdate();
  const systemScheme = useColorScheme();

  const chooseTheme = (next: ThemePreference) => {
    const nextScheme = next === "system" ? (systemScheme === "dark" ? "dark" : "light") : next;
    // التبديل يعيد تركيب التطبيق كلّه؛ نحفظ هذه الشاشة لنعود إليها بعده.
    if (nextScheme !== getColorScheme()) rememberRoute("/settings");
    setTheme(next);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="الإعدادات" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>الإشعارات</Text>
        <View style={styles.card}>
          <ToggleRow
            icon="calendar-outline"
            label="تذكير بالأنشطة المسجّل فيها"
            hint="قبل موعد النشاط بيوم"
            value={activityReminders}
            onChange={() => toggle("activityReminders")}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="megaphone-outline"
            label="تنبيهات الإعلانات"
            hint="فتح التسجيل، تغيير المواعيد، النتائج"
            value={announcementAlerts}
            onChange={() => toggle("announcementAlerts")}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="help-circle-outline"
            label="تذكير بأسئلة الأسبوع"
            hint="عند نشر أسئلة ثقافية جديدة"
            value={quizReminders}
            onChange={() => toggle("quizReminders")}
          />
        </View>

        <Text style={styles.sectionLabel}>المظهر</Text>
        <View style={styles.card}>
          <View style={styles.segment}>
            {THEME_OPTIONS.map((option) => {
              const active = theme === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => chooseTheme(option.value)}
                  style={[styles.segmentItem, active && styles.segmentItemActive]}
                >
                  <Ionicons
                    name={option.icon}
                    size={17}
                    color={active ? colors.textOnPrimary : colors.textSecondary}
                  />
                  <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.segmentHint}>
            {theme === "system"
              ? "يتبع إعداد الهاتف: يُظلم إذا أظلم ويُضيء إذا أضاء."
              : theme === "dark"
                ? "مظهرٌ داكن دائمًا — أريح للعين في الليل ويوفّر البطارية."
                : "مظهرٌ فاتح دائمًا مهما كان إعداد الهاتف."}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>اللغة</Text>
        <View style={styles.card}>
          <View style={styles.staticRow}>
            <Ionicons name="language-outline" size={19} color={colors.primary} />
            <Text style={styles.rowLabel}>العربية</Text>
            <Text style={styles.rowValue}>الافتراضية</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>الخصوصية</Text>
        <View style={styles.card}>
          {PRIVACY_POINTS.map((point) => (
            <View key={point} style={styles.privacyRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.privacyText}>{point}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>عن التطبيق</Text>
        <View style={styles.card}>
          <View style={styles.staticRow}>
            <Ionicons name="information-circle-outline" size={19} color={colors.primary} />
            <Text style={styles.rowLabel}>أنشطتي — قاعدة صلالة الجوية</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.staticRow}>
            <Ionicons name="person-circle-outline" size={19} color={colors.primary} />
            <Text style={styles.rowLabel}>إعداد وتنفيذ</Text>
            <Text style={styles.rowValue}>عبدالرحمن بن سعيد المعشني</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.staticRow}>
            <Ionicons name="pricetag-outline" size={19} color={colors.primary} />
            <Text style={styles.rowLabel}>الإصدار</Text>
            <Text style={styles.rowValue}>{installedVersion()}</Text>
          </View>
          <View style={styles.divider} />
          {/*
            فحصٌ بالطلب، إلى جانب الفحص التلقائي عند كل فتحة.
            التحديث يصل وحده، لكن من ينتظر إصلاحًا بعينه لا يريد أن ينتظر
            فتحةً تالية ليعرف — ولا أن يسأل أحدًا «هل وصل؟».
          */}
          <Pressable
            accessibilityRole="button"
            onPress={() => void checkNow()}
            disabled={checking}
            style={({ pressed }) => [styles.staticRow, pressed ? styles.rowPressed : null]}
          >
            <Ionicons name="cloud-download-outline" size={19} color={colors.primary} />
            <Text style={styles.rowLabel}>ابحث عن تحديث</Text>
            {checking ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="chevron-back" size={17} color={colors.textMuted} />
            )}
          </Pressable>
        </View>

        <Text style={styles.footer}>
          تطبيق أنشطة وتثقيف وتنظيم فقط — لا يتضمن أي معلومة عسكرية سرية أو تشغيلية.
        </Text>
      </ScrollView>
    </View>
  );
}

function ToggleRow({
  icon,
  label,
  hint,
  value,
  onChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  value: boolean;
  onChange: () => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Ionicons name={icon} size={19} color={colors.primary} />
      <View style={styles.toggleText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

const styles = themed(() => ({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: spacing.sm },
  sectionLabel: { ...typography.h3, marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  toggleText: { flex: 1, gap: 2 },
  staticRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  rowLabel: { ...typography.body, flex: 1 },
  rowHint: { ...typography.caption },
  rowPressed: { opacity: 0.6 },
  rowValue: { ...typography.caption },
  divider: { height: 1, backgroundColor: colors.border },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 3,
    marginTop: spacing.md,
    gap: 3,
  },
  segmentItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: radius.sm,
  },
  segmentItemActive: { backgroundColor: colors.primary },
  segmentLabel: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: colors.textSecondary },
  segmentLabelActive: { color: colors.textOnPrimary },
  segmentHint: { ...typography.caption, paddingVertical: spacing.md, lineHeight: 19 },
  privacyRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, paddingVertical: spacing.sm },
  privacyText: { ...typography.bodyMuted, flex: 1, lineHeight: 20 },
  footer: { ...typography.caption, textAlign: "center", marginTop: spacing.xl, lineHeight: 19 },
}));
