import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SecondaryButton } from "@/components/SecondaryButton";
import { colors, radius, spacing, typography } from "@/constants";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { useAdminStore } from "@/store/adminStore";
import { showToast } from "@/store/toastStore";
import { REGISTRATION_LABEL } from "@/utils/registration";
import type { RegistrationState } from "@/types/models";

const STATUS_OPTIONS: RegistrationState[] = ["open", "upcoming", "closed"];
const POINT_OPTIONS = [5, 10, 15, 20];

/** إعدادات لوحة الإدارة — كل مفتاح هنا يغيّر سلوك التطبيق فعليًا. */
export default function AdminSettingsScreen() {
  const client = useQueryClient();
  const settings = useAdminSettingsStore();
  const lock = useAdminStore((state) => state.lock);

  const [code, setCode] = useState(settings.code);
  const [confirmCode, setConfirmCode] = useState("");

  const applyToggle = (key: "quizEnabled" | "pointsEnabled" | "registrationEnabled", label: string) => {
    const next = !settings[key];
    settings.toggle(key);
    settings.logAction(`${next ? "تفعيل" : "تعطيل"} ${label}`);
    client.invalidateQueries();
    showToast(`${next ? "تم تفعيل" : "تم تعطيل"} ${label}`, "success");
  };

  const handleSaveCode = () => {
    if (!/^\d{4,6}$/.test(code.trim())) {
      showToast("الرمز يجب أن يكون من 4 إلى 6 أرقام", "error");
      return;
    }
    if (code.trim() !== confirmCode.trim()) {
      showToast("الرمز وتأكيده غير متطابقين", "error");
      return;
    }
    settings.setCode(code);
    settings.logAction("تغيير رمز الإدارة");
    setConfirmCode("");
    showToast("تم تغيير رمز الإدارة", "success");
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="إعدادات اللوحة" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionLabel}>رمز الإدارة</Text>
        <View style={styles.card}>
          <Text style={styles.cardHint}>
            الرمز المطلوب في شاشة دخول الإدارة. غيّره فور تسليم التطبيق، ولا تشاركه خارج فريق الإدارة.
          </Text>
          <Text style={styles.fieldLabel}>الرمز الجديد</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            secureTextEntry
            style={styles.codeInput}
            textAlign="center"
          />
          <Text style={styles.fieldLabel}>تأكيد الرمز</Text>
          <TextInput
            value={confirmCode}
            onChangeText={setConfirmCode}
            keyboardType="number-pad"
            maxLength={6}
            secureTextEntry
            style={styles.codeInput}
            textAlign="center"
          />
          <SecondaryButton label="حفظ الرمز" onPress={handleSaveCode} style={{ marginTop: spacing.md }} />
        </View>

        <Text style={styles.sectionLabel}>مفاتيح التشغيل</Text>
        <View style={styles.card}>
          <ToggleRow
            icon="create-outline"
            label="التسجيل في الأنشطة"
            hint="عند الإيقاف يختفي زر التسجيل من كل الأنشطة"
            value={settings.registrationEnabled}
            onChange={() => applyToggle("registrationEnabled", "التسجيل في الأنشطة")}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="help-circle-outline"
            label="السؤال الثقافي الأسبوعي"
            hint="عند الإيقاف لا يظهر السؤال للمستخدمين"
            value={settings.quizEnabled}
            onChange={() => applyToggle("quizEnabled", "السؤال الثقافي")}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="ribbon-outline"
            label="نظام النقاط"
            hint="عند الإيقاف لا تُمنح نقاط على الحضور ولا على الإجابات"
            value={settings.pointsEnabled}
            onChange={() => applyToggle("pointsEnabled", "نظام النقاط")}
          />
        </View>

        <Text style={styles.sectionLabel}>قيمة النقاط لكل عملية</Text>
        <View style={styles.chipWrap}>
          {POINT_OPTIONS.map((value) => {
            const active = value === settings.pointsPerAction;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  settings.setPointsPerAction(value);
                  settings.logAction(`ضبط قيمة النقاط على ${value}`);
                  showToast(`أصبحت كل عملية تمنح ${value} نقاط`, "success");
                }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{value} نقاط</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>
          القيمة موحّدة لكل الأسباب — حضور محاضرة، مشاركة في نشاط، وإجابة صحيحة — حتى يبقى النظام
          مفهومًا وعادلًا.
        </Text>

        <Text style={styles.sectionLabel}>الحالة الافتراضية عند إضافة نشاط</Text>
        <View style={styles.chipWrap}>
          {STATUS_OPTIONS.map((status) => {
            const active = status === settings.defaultRegistrationStatus;
            return (
              <Pressable
                key={status}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  settings.setDefaultRegistrationStatus(status);
                  settings.logAction(`ضبط الحالة الافتراضية على «${REGISTRATION_LABEL[status]}»`);
                }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {REGISTRATION_LABEL[status]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>الحسابات والسجل</Text>
        <View style={{ gap: spacing.sm }}>
          <LinkRow
            icon="people-circle-outline"
            label={`الحسابات الإدارية (${settings.admins.length})`}
            hint="إضافة أو إزالة من يملك صلاحية فتح اللوحة"
            onPress={() => router.push("/admin/admins")}
          />
          <LinkRow
            icon="time-outline"
            label={`سجل العمليات (${settings.log.length})`}
            hint="كل ما تمّ من اللوحة، بالترتيب الزمني"
            onPress={() => router.push("/admin/log")}
          />
          <LinkRow
            icon="notifications-outline"
            label="الإشعارات المرسلة"
            hint="مراجعة الإشعارات السابقة وحذف ما لم يعد مناسبًا"
            onPress={() => router.push("/admin/notifications")}
          />
        </View>

        <PrimaryButton
          label="قفل اللوحة"
          onPress={() => {
            lock();
            showToast("تم قفل لوحة الإدارة", "info");
            router.replace("/(tabs)");
          }}
          style={{ marginTop: spacing.xl, backgroundColor: colors.danger }}
        />

        <Text style={styles.note}>
          هذه الإعدادات محفوظة على الجهاز في النسخة التجريبية. عند ربط Supabase تُحفظ على الخادم
          وتُطبَّق على كل المستخدمين، ولا يقبلها الخادم إلا من حساب مُدرج في جدول الإداريين.
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
      <Ionicons name={icon} size={20} color={colors.primary} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleHint}>{hint}</Text>
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

function LinkRow({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name={icon} size={20} color={colors.primary} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleHint}>{hint}</Text>
      </View>
      <Ionicons name="chevron-back" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl },
  sectionLabel: { ...typography.h3, marginTop: spacing.xl, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  cardHint: { ...typography.caption, lineHeight: 20, marginBottom: spacing.md },
  fieldLabel: { ...typography.caption, marginBottom: spacing.xs, marginTop: spacing.sm },
  codeInput: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    height: 50,
    fontFamily: "Tajawal_700Bold",
    fontSize: 20,
    letterSpacing: 8,
    color: colors.textPrimary,
  },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  toggleLabel: { ...typography.body, fontFamily: "Tajawal_500Medium" },
  toggleHint: { ...typography.caption, fontSize: 12, lineHeight: 18 },
  divider: { height: 1, backgroundColor: colors.border },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: "Tajawal_500Medium", fontSize: 12.5, color: colors.textMuted },
  chipTextActive: { color: colors.textOnPrimary },
  hint: { ...typography.caption, lineHeight: 20, marginTop: spacing.sm },
  note: { ...typography.caption, lineHeight: 20, marginTop: spacing.xl, textAlign: "center" },
});
