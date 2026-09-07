import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BottomSheet } from "@/components/BottomSheet";
import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SecondaryButton } from "@/components/SecondaryButton";
import { CATEGORY_META, tintBackground } from "@/constants/categories";
import { colors, radius, spacing, typography } from "@/constants";
import { fetchActivityById } from "@/services/activityService";
import {
  deleteActivity,
  generateCheckInCode,
  setActivityResults,
  setCheckInCode,
  updateActivity,
} from "@/services/adminService";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { showToast } from "@/store/toastStore";
import { REGISTRATION_COLOR, REGISTRATION_LABEL } from "@/utils/registration";
import type { ActivityResult, RegistrationState } from "@/types/models";

const STATUS_OPTIONS: RegistrationState[] = ["open", "upcoming", "closed", "full", "ended"];
const RANKS: { rank: 1 | 2 | 3; label: string; tint: string }[] = [
  { rank: 1, label: "المركز الأول", tint: "#C7A252" },
  { rank: 2, label: "المركز الثاني", tint: "#75808F" },
  { rank: 3, label: "المركز الثالث", tint: "#B7791F" },
];

/** إدارة نشاط واحد: تعديل بياناته، حالة التسجيل، رمز الحضور، أو حذفه. */
export default function ManageActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useQueryClient();
  const { data: activity, isLoading } = useQuery({
    queryKey: ["activity", id],
    queryFn: () => fetchActivityById(id),
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [status, setStatus] = useState<RegistrationState>("open");
  const [isAnnual, setIsAnnual] = useState(false);
  const [code, setCode] = useState("");
  const [winners, setWinners] = useState<string[]>(["", "", ""]);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const logAction = useAdminSettingsStore((state) => state.logAction);

  // تُملأ الحقول مرة واحدة عند وصول النشاط، ثم تبقى تحت سيطرة المستخدم.
  useEffect(() => {
    if (!activity) return;
    setTitle(activity.title);
    setDescription(activity.description);
    setDate(activity.date);
    setStartTime(activity.startTime);
    setEndTime(activity.endTime ?? "");
    setLocation(activity.location);
    setCapacity(activity.capacity != null ? String(activity.capacity) : "");
    setStatus(activity.registrationStatus);
    setIsAnnual(Boolean(activity.isAnnual));
    setCode(activity.checkInCode ?? "");
    setWinners(
      RANKS.map((entry) => activity.results?.find((r) => r.rank === entry.rank)?.winnerName ?? "")
    );
  }, [activity]);

  if (isLoading) return <View style={styles.screen} />;
  if (!activity) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="إدارة النشاط" />
        <EmptyState icon="alert-circle-outline" title="لم يتم العثور على هذا النشاط" />
      </View>
    );
  }

  const meta = CATEGORY_META[activity.category];
  const registered = activity.registeredCount ?? 0;
  const fillRatio = activity.capacity ? Math.min(registered / activity.capacity, 1) : 0;
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const timeValid = /^\d{2}:\d{2}$/.test(startTime);
  const canSave = title.trim().length > 2 && description.trim().length > 5 && dateValid && timeValid && location.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) {
      showToast("أكمل الحقول المطلوبة بالتنسيق الصحيح", "error");
      return;
    }
    setSaving(true);
    try {
      await updateActivity(activity.id, {
        title: title.trim(),
        description: description.trim(),
        date,
        startTime,
        endTime: /^\d{2}:\d{2}$/.test(endTime) ? endTime : undefined,
        location: location.trim(),
        capacity: capacity ? Number(capacity) : undefined,
        registrationStatus: status,
        isAnnual,
      });
      client.invalidateQueries();
      logAction(`تعديل نشاط: ${title.trim()}`);
      showToast("تم حفظ التعديلات", "success");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCode = async () => {
    if (code.trim().length < 4) {
      showToast("الرمز يجب أن يكون 4 خانات على الأقل", "error");
      return;
    }
    const saved = await setCheckInCode(activity.id, code);
    setCode(saved);
    client.invalidateQueries();
    logAction(`ضبط رمز حضور: ${activity.title}`);
    showToast("تم حفظ رمز الحضور", "success");
  };

  const handleSaveResults = async () => {
    const results: ActivityResult[] = RANKS.map((entry, index) => ({
      rank: entry.rank,
      winnerName: winners[index],
    }));
    await setActivityResults(activity.id, results);
    client.invalidateQueries();
    logAction(`تحديث نتائج: ${activity.title}`);
    showToast("تم حفظ النتائج", "success");
  };

  const handleDelete = async () => {
    await deleteActivity(activity.id);
    setConfirmingDelete(false);
    client.invalidateQueries();
    logAction(`حذف نشاط: ${activity.title}`);
    showToast("تم حذف النشاط", "success");
    router.back();
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="إدارة النشاط"
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="معاينة كما يراها المستخدم"
            onPress={() => router.push(`/activity/${activity.id}`)}
            hitSlop={8}
          >
            <Ionicons name="eye-outline" size={20} color={colors.primary} />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <View style={[styles.summaryIcon, { backgroundColor: tintBackground(meta.tint) }]}>
            <Ionicons name={meta.icon} size={22} color={meta.tint} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.summaryTitle} numberOfLines={2}>
              {activity.title}
            </Text>
            <Text style={styles.summaryMeta}>
              {meta.label} · {REGISTRATION_LABEL[activity.registrationStatus]}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>التسجيل</Text>
            <Text style={[styles.badge, { color: REGISTRATION_COLOR[activity.registrationStatus] }]}>
              {registered}
              {activity.capacity ? ` من ${activity.capacity}` : " مسجّل"}
            </Text>
          </View>
          {activity.capacity ? (
            <>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${fillRatio * 100}%` }]} />
              </View>
              <Text style={styles.cardHint}>
                {Math.max(activity.capacity - registered, 0)} مقعدًا متبقيًا
              </Text>
            </>
          ) : (
            <Text style={styles.cardHint}>لا يوجد حد للمقاعد في هذا النشاط.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>رمز الحضور</Text>
          <Text style={styles.cardHint}>
            يُعرض في القاعة (QR أو إدخال يدوي) ليؤكد الحاضر حضوره ويحصل على النقاط. لا يظهر هذا الرمز
            لأي مستخدم داخل التطبيق، ولا يُقرأ إلا داخل الخادم عند التحقق.
          </Text>
          <View style={styles.codeRow}>
            <TextInput
              value={code}
              onChangeText={(text) => setCode(text.toUpperCase())}
              placeholder="بدون رمز"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              maxLength={10}
              style={styles.codeInput}
              textAlign="center"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="توليد رمز جديد"
              onPress={() => setCode(generateCheckInCode())}
              style={styles.codeButton}
            >
              <Ionicons name="refresh-outline" size={18} color={colors.primary} />
            </Pressable>
          </View>
          <SecondaryButton label="حفظ الرمز" onPress={handleSaveCode} style={{ marginTop: spacing.md }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>نتائج النشاط</Text>
          <Text style={styles.cardHint}>
            تُعرض في شاشة تفاصيل النشاط بعد اعتمادها. اترك الحقل فارغًا لإخفاء المركز.
          </Text>
          {RANKS.map((entry, index) => (
            <View key={entry.rank} style={styles.winnerRow}>
              <View style={[styles.winnerBadge, { backgroundColor: tintBackground(entry.tint, 0.14) }]}>
                <Text style={[styles.winnerRank, { color: entry.tint }]}>{entry.rank}</Text>
              </View>
              <TextInput
                value={winners[index]}
                onChangeText={(text) =>
                  setWinners((current) => current.map((w, i) => (i === index ? text : w)))
                }
                placeholder={entry.label}
                placeholderTextColor={colors.textMuted}
                style={styles.winnerInput}
                textAlign="right"
              />
            </View>
          ))}
          <SecondaryButton label="حفظ النتائج" onPress={handleSaveResults} style={{ marginTop: spacing.md }} />
        </View>

        <Text style={styles.sectionLabel}>بيانات النشاط</Text>
        <Field label="اسم النشاط" value={title} onChange={setTitle} placeholder="اسم النشاط" />
        <Field label="الوصف" value={description} onChange={setDescription} placeholder="وصف مختصر" multiline />
        <Field label="التاريخ (YYYY-MM-DD)" value={date} onChange={setDate} placeholder="2026-10-15" />
        <Field label="وقت البداية (HH:mm)" value={startTime} onChange={setStartTime} placeholder="10:00" />
        <Field label="وقت النهاية (اختياري)" value={endTime} onChange={setEndTime} placeholder="12:00" />
        <Field label="المكان" value={location} onChange={setLocation} placeholder="قاعة الأنشطة" />
        <Field label="عدد المقاعد (اختياري)" value={capacity} onChange={setCapacity} placeholder="60" numeric />

        <Text style={styles.label}>حالة التسجيل</Text>
        <View style={styles.chipWrap}>
          {STATUS_OPTIONS.map((option) => {
            const active = option === status;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setStatus(option)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {REGISTRATION_LABEL[option]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>مناسبة سنوية</Text>
            <Text style={styles.switchHint}>تتكرر كل عام في التقويم السنوي</Text>
          </View>
          <Switch
            value={isAnnual}
            onValueChange={setIsAnnual}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.surface}
          />
        </View>

        <PrimaryButton
          label="حفظ التعديلات"
          onPress={handleSave}
          loading={saving}
          disabled={!canSave}
          style={{ marginTop: spacing.lg }}
        />
        <SecondaryButton
          label="حذف النشاط"
          onPress={() => setConfirmingDelete(true)}
          textColor={colors.danger}
          style={{ marginTop: spacing.sm }}
        />
      </ScrollView>

      <BottomSheet visible={confirmingDelete} onClose={() => setConfirmingDelete(false)}>
        <Text style={styles.sheetTitle}>حذف النشاط</Text>
        <Text style={styles.sheetBody}>
          سيُحذف «{activity.title}» نهائيًا مع كل تسجيلاته، ولن يظهر في التقويم ولا في أي قسم.
        </Text>
        <PrimaryButton
          label="حذف نهائيًا"
          onPress={handleDelete}
          style={{ marginTop: spacing.lg, backgroundColor: colors.danger }}
        />
        <SecondaryButton
          label="تراجع"
          onPress={() => setConfirmingDelete(false)}
          style={{ marginTop: spacing.sm }}
        />
      </BottomSheet>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  numeric,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  numeric?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, multiline && styles.inputMultiline]}
        multiline={multiline}
        keyboardType={numeric ? "number-pad" : "default"}
        textAlign="right"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  summaryIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  summaryTitle: { ...typography.h3 },
  summaryMeta: { ...typography.caption },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: { ...typography.h3, fontSize: 15 },
  cardHint: { ...typography.caption, lineHeight: 19 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  progressTrack: { height: 6, borderRadius: radius.pill, backgroundColor: colors.background, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: radius.pill, backgroundColor: colors.primary },
  codeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  codeInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    height: 50,
    fontFamily: "Tajawal_700Bold",
    fontSize: 18,
    letterSpacing: 4,
    color: colors.textPrimary,
  },
  codeButton: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  winnerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  winnerBadge: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  winnerRank: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  winnerInput: {
    flex: 1,
    ...typography.body,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  sectionLabel: { ...typography.h3, marginTop: spacing.xl, marginBottom: spacing.xs },
  field: { marginBottom: spacing.md },
  label: { ...typography.h3, fontSize: 14, marginBottom: spacing.sm, marginTop: spacing.sm },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 50,
  },
  inputMultiline: { height: 100, paddingTop: spacing.md, textAlignVertical: "top" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: "Tajawal_500Medium", fontSize: 12.5, color: colors.textMuted },
  chipTextActive: { color: colors.textOnPrimary },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  switchLabel: { ...typography.body, fontFamily: "Tajawal_500Medium" },
  switchHint: { ...typography.caption },
  sheetTitle: { ...typography.h2, textAlign: "center" },
  sheetBody: { ...typography.bodyMuted, textAlign: "center", marginTop: spacing.sm, lineHeight: 22 },
});
