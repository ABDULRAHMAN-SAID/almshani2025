import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { CATEGORY_META, tintBackground, type ActivityCategory } from "@/constants/categories";
import { colors, radius, spacing, typography } from "@/constants";
import { addMockActivity } from "@/services/adminService";
import { showToast } from "@/store/toastStore";
import type { RegistrationState } from "@/types/models";

const CATEGORY_KEYS = Object.keys(CATEGORY_META).filter((key) => key !== "Announcement") as ActivityCategory[];

const STATUS_OPTIONS: { key: RegistrationState; label: string }[] = [
  { key: "open", label: "التسجيل مفتوح" },
  { key: "upcoming", label: "قريبًا" },
  { key: "closed", label: "التسجيل مغلق" },
];

/** نموذج إضافة نشاط — يغطي الحقول المطلوبة في المواصفة. */
export default function NewActivityScreen() {
  const client = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ActivityCategory>("Cultural");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [status, setStatus] = useState<RegistrationState>("open");
  const [isAnnual, setIsAnnual] = useState(false);
  const [saving, setSaving] = useState(false);

  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const timeValid = /^\d{2}:\d{2}$/.test(startTime);
  const canSave = title.trim().length > 2 && description.trim().length > 5 && dateValid && timeValid && location.trim();

  const handleSave = async () => {
    if (!canSave) {
      showToast("أكمل الحقول المطلوبة بالتنسيق الصحيح", "error");
      return;
    }
    setSaving(true);
    try {
      addMockActivity({
        title: title.trim(),
        description: description.trim(),
        category,
        date,
        startTime,
        endTime: /^\d{2}:\d{2}$/.test(endTime) ? endTime : undefined,
        location: location.trim(),
        capacity: capacity ? Number(capacity) : undefined,
        registeredCount: 0,
        registrationStatus: status,
        isAnnual,
      });
      client.invalidateQueries();
      showToast("تمت إضافة النشاط", "success");
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="إضافة نشاط" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Field label="اسم النشاط" value={title} onChange={setTitle} placeholder="مثال: المسابقة الثقافية السنوية" />

        <Text style={styles.label}>التصنيف</Text>
        <View style={styles.chipWrap}>
          {CATEGORY_KEYS.map((key) => {
            const meta = CATEGORY_META[key];
            const active = key === category;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                onPress={() => setCategory(key)}
                style={[
                  styles.chip,
                  active && { backgroundColor: tintBackground(meta.tint, 0.14), borderColor: meta.tint },
                ]}
              >
                <Text style={[styles.chipText, active && { color: meta.tint }]}>{meta.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Field
          label="الوصف"
          value={description}
          onChange={setDescription}
          placeholder="وصف مختصر للنشاط"
          multiline
        />
        <Field label="التاريخ (YYYY-MM-DD)" value={date} onChange={setDate} placeholder="2026-10-15" />
        <Field label="وقت البداية (HH:mm)" value={startTime} onChange={setStartTime} placeholder="10:00" />
        <Field label="وقت النهاية (اختياري)" value={endTime} onChange={setEndTime} placeholder="12:00" />
        <Field label="المكان" value={location} onChange={setLocation} placeholder="قاعة الأنشطة" />
        <Field
          label="عدد المقاعد (اختياري)"
          value={capacity}
          onChange={setCapacity}
          placeholder="60"
          numeric
        />

        <Text style={styles.label}>حالة التسجيل</Text>
        <View style={styles.chipWrap}>
          {STATUS_OPTIONS.map((option) => {
            const active = option.key === status;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                onPress={() => setStatus(option.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
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
          label="حفظ النشاط"
          onPress={handleSave}
          loading={saving}
          disabled={!canSave}
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
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
});
