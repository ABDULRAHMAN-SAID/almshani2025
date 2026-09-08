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

  const [pin, setPin] = useState(settings.devicePin);
  const [confirmPin, setConfirmPin] = useState("");

  const applyToggle = (
    key: "quizEnabled" | "pointsEnabled" | "registrationEnabled" | "discussionEnabled" | "messagesEnabled",
    label: string
  ) => {
    const next = !settings[key];
    settings.toggle(key);
    settings.logAction(`${next ? "تفعيل" : "تعطيل"} ${label}`);
    client.invalidateQueries();
    showToast(`${next ? "تم تفعيل" : "تم تعطيل"} ${label}`, "success");
  };

  const handleSavePin = () => {
    if (!/^\d{4,6}$/.test(pin.trim())) {
      showToast("القفل يجب أن يكون من 4 إلى 6 أرقام", "error");
      return;
    }
    if (pin.trim() !== confirmPin.trim()) {
      showToast("القفل وتأكيده غير متطابقين", "error");
      return;
    }
    settings.setDevicePin(pin);
    settings.setDevicePinEnabled(true);
    settings.logAction("ضبط قفل الجهاز");
    setConfirmPin("");
    showToast("تم ضبط قفل هذا الجهاز", "success");
  };

  const handleDisablePin = () => {
    settings.setDevicePinEnabled(false);
    settings.setDevicePin("");
    settings.logAction("إلغاء قفل الجهاز");
    setPin("");
    setConfirmPin("");
    showToast("أُلغي قفل هذا الجهاز", "success");
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="إعدادات اللوحة" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionLabel}>الصلاحية</Text>
        <View style={styles.card}>
          <View style={styles.authRow}>
            <Ionicons name="shield-checkmark-outline" size={19} color={colors.success} />
            <Text style={styles.authText}>
              صلاحية الإدارة تُقرَّر على الخادم بحسب جدول الإداريين، لا برمز داخل التطبيق.
              كل عملية إدارية تُفحص هناك مرة أخرى، فلا يمنح فتحُ هذه الشاشة أي صلاحية.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>قفل هذا الجهاز (اختياري)</Text>
        <View style={styles.card}>
          <Text style={styles.cardHint}>
            طبقة إضافية على هذا الجهاز وحده: بعد أن يقرّ الخادم صلاحيتك، يُطلب هذا القفل قبل فتح
            اللوحة. مفيد على جهاز مشترك، ولا يُرسَل إلى أي مكان ولا يمنح صلاحية بذاته.
          </Text>

          {settings.devicePinEnabled ? (
            <>
              <View style={styles.pinState}>
                <Ionicons name="lock-closed" size={15} color={colors.success} />
                <Text style={styles.pinStateText}>القفل مفعّل على هذا الجهاز</Text>
              </View>
              <SecondaryButton
                label="إلغاء القفل"
                onPress={handleDisablePin}
                textColor={colors.danger}
                style={{ marginTop: spacing.md, borderColor: colors.danger }}
              />
            </>
          ) : null}

          <Text style={styles.fieldLabel}>{settings.devicePinEnabled ? "قفل جديد" : "القفل"}</Text>
          <TextInput
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            maxLength={6}
            secureTextEntry
            style={styles.codeInput}
            textAlign="center"
          />
          <Text style={styles.fieldLabel}>التأكيد</Text>
          <TextInput
            value={confirmPin}
            onChangeText={setConfirmPin}
            keyboardType="number-pad"
            maxLength={6}
            secureTextEntry
            style={styles.codeInput}
            textAlign="center"
          />
          <SecondaryButton
            label={settings.devicePinEnabled ? "تغيير القفل" : "تفعيل القفل"}
            onPress={handleSavePin}
            style={{ marginTop: spacing.md }}
          />
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
          <View style={styles.divider} />
          <ToggleRow
            icon="chatbubbles-outline"
            label="المجموعات النقاشية"
            hint="لوحات نقاش عامة مُدارة — بلا رسائل خاصة بين المستخدمين"
            value={settings.discussionEnabled}
            onChange={() => applyToggle("discussionEnabled", "المجموعات النقاشية")}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="mail-outline"
            label="مراسلة الإدارة"
            hint="عند الإيقاف لا يستطيع المستخدم إرسال رسالة جديدة"
            value={settings.messagesEnabled}
            onChange={() => applyToggle("messagesEnabled", "مراسلة الإدارة")}
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
  authRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  authText: { ...typography.caption, flex: 1, lineHeight: 20, color: colors.textSecondary },
  pinState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.successSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  pinStateText: { ...typography.caption, color: colors.success, fontFamily: "Tajawal_500Medium" },
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
