import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";
import { BUILD_STAMP } from "@/services/config";
import { useSettingsStore } from "@/store/settingsStore";

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
  const { activityReminders, announcementAlerts, quizReminders, toggle } = useSettingsStore();

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
            <Ionicons name="pricetag-outline" size={19} color={colors.primary} />
            <Text style={styles.rowLabel}>الإصدار</Text>
            <Text style={styles.rowValue}>{installedVersion()}</Text>
          </View>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: spacing.sm },
  sectionLabel: { ...typography.h3, marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  toggleText: { flex: 1, gap: 2 },
  staticRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  rowLabel: { ...typography.body, flex: 1 },
  rowHint: { ...typography.caption },
  rowValue: { ...typography.caption },
  divider: { height: 1, backgroundColor: colors.border },
  privacyRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, paddingVertical: spacing.sm },
  privacyText: { ...typography.bodyMuted, flex: 1, lineHeight: 20 },
  footer: { ...typography.caption, textAlign: "center", marginTop: spacing.xl, lineHeight: 19 },
});
