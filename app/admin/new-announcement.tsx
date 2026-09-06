import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";
import { addAnnouncement } from "@/services/adminService";
import { showToast } from "@/store/toastStore";
import type { AnnouncementType } from "@/types/models";

const TYPES: AnnouncementType[] = ["تسجيل", "تنبيه", "نتائج", "عام"];

export default function NewAnnouncementScreen() {
  const client = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<AnnouncementType>("عام");
  const [saving, setSaving] = useState(false);

  const canSave = title.trim().length > 3 && description.trim().length > 5;

  const handleSave = async () => {
    setSaving(true);
    try {
      await addAnnouncement({ title: title.trim(), description: description.trim(), type });
      client.invalidateQueries();
      showToast("تم نشر الإعلان", "success");
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="نشر إعلان" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>عنوان الإعلان</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="مثال: فتح باب التسجيل في بطولة كرة القدم"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          textAlign="right"
        />

        <Text style={styles.label}>نص الإعلان</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="تفاصيل الإعلان كما ستظهر للمستخدمين"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.multiline]}
          multiline
          textAlign="right"
        />

        <Text style={styles.label}>نوع الإعلان</Text>
        <View style={styles.chipWrap}>
          {TYPES.map((option) => {
            const active = option === type;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                onPress={() => setType(option)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
              </Pressable>
            );
          })}
        </View>

        <PrimaryButton
          label="نشر الإعلان"
          onPress={handleSave}
          loading={saving}
          disabled={!canSave}
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl },
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
});
