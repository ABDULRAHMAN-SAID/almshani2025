import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ImageField } from "@/components/ImageField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";
import { useAllActivities } from "@/hooks/useActivities";
import { createGroup } from "@/services/groupService";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { showToast } from "@/store/toastStore";
import type { GroupAudience } from "@/types/models";
import { toArabicMessage } from "@/utils/errors";

const TOPICS = ["الأنشطة الرياضية", "ثقافي", "توعية", "تنظيم", "عام"];

const AUDIENCES: { key: GroupAudience; label: string; hint: string }[] = [
  { key: "all", label: "مفتوحة للجميع", hint: "يقرأ ويكتب كل مستخدم مسجَّل في التطبيق." },
  {
    key: "registered",
    label: "للمسجّلين في نشاط",
    hint: "يقرأ الجميع، ولا يكتب إلا من سجّل في النشاط المرتبط.",
  },
];

export default function NewGroupScreen() {
  const client = useQueryClient();
  const logAction = useAdminSettingsStore((state) => state.logAction);
  const { data: activities } = useAllActivities();

  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [audience, setAudience] = useState<GroupAudience>("all");
  const [activityId, setActivityId] = useState("");
  const [saving, setSaving] = useState(false);

  const canSave =
    title.trim().length > 3 &&
    description.trim().length > 9 &&
    (audience === "all" || activityId.length > 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      await createGroup({
        title: title.trim(),
        topic,
        description: description.trim(),
        coverImage: coverImage || undefined,
        audience,
        activityId: audience === "registered" ? activityId : undefined,
        locked: false,
      });
      await client.invalidateQueries({ queryKey: ["groups"] });
      logAction(`إنشاء مجموعة نقاشية: ${title.trim()}`);
      showToast("تم إنشاء المجموعة", "success");
      router.back();
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر إنشاء المجموعة"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="مجموعة نقاشية جديدة" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.notice}>
          <Ionicons name="shield-half-outline" size={17} color={colors.warning} />
          <Text style={styles.noticeText}>
            المجموعة لوحة نقاش عامة حول موضوع نشاط: كل مشاركة يراها الجميع، ولا توجد مراسلة خاصة بين
            المستخدمين. اكتب في الوصف ضوابط النقاش بوضوح.
          </Text>
        </View>

        <Text style={styles.label}>اسم المجموعة</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="مثال: تنظيم البطولة الرياضية"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          textAlign="right"
        />

        <Text style={styles.label}>الموضوع</Text>
        <View style={styles.chipWrap}>
          {TOPICS.map((option) => {
            const active = option === topic;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                onPress={() => setTopic(option)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>الوصف وضوابط النقاش</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="ما الهدف من المجموعة وما المسموح نشره فيها"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.multiline]}
          multiline
          textAlign="right"
        />

        <ImageField
          label="صورة المجموعة (اختياري)"
          hint="تظهر في قائمة المجموعات."
          value={coverImage}
          onChange={setCoverImage}
          folder="groups"
        />

        <Text style={styles.label}>من يكتب في المجموعة</Text>
        {AUDIENCES.map((option) => {
          const active = option.key === audience;
          return (
            <Pressable
              key={option.key}
              accessibilityRole="button"
              onPress={() => setAudience(option.key)}
              style={[styles.option, active && styles.optionActive]}
            >
              <Ionicons
                name={active ? "radio-button-on" : "radio-button-off"}
                size={19}
                color={active ? colors.primary : colors.textMuted}
              />
              <View style={styles.optionBody}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionHint}>{option.hint}</Text>
              </View>
            </Pressable>
          );
        })}

        {audience === "registered" ? (
          <>
            <Text style={styles.label}>النشاط المرتبط</Text>
            <View style={styles.chipWrap}>
              {(activities ?? []).map((activity) => {
                const active = activity.id === activityId;
                return (
                  <Pressable
                    key={activity.id}
                    accessibilityRole="button"
                    onPress={() => setActivityId(activity.id)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                      {activity.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        <PrimaryButton
          label="إنشاء المجموعة"
          onPress={handleSave}
          loading={saving}
          disabled={!canSave}
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl },
  notice: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  noticeText: { ...typography.caption, flex: 1, lineHeight: 20, color: colors.textSecondary },
  label: { ...typography.h3, fontSize: 14, marginBottom: spacing.sm, marginTop: spacing.md },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 50,
  },
  multiline: { height: 120, paddingTop: spacing.md, textAlignVertical: "top" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    maxWidth: "100%",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: colors.textMuted },
  chipTextActive: { color: colors.textOnPrimary },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.surfaceRaised },
  optionBody: { flex: 1, gap: 2 },
  optionLabel: { ...typography.body, fontSize: 14, fontFamily: "Tajawal_500Medium" },
  optionHint: { ...typography.caption, fontSize: 11, lineHeight: 18 },
});
