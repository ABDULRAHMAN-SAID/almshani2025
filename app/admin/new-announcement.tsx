import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ImageField } from "@/components/ImageField";
import { MediaField } from "@/components/MediaField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";
import { addAnnouncement } from "@/services/adminService";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { showToast } from "@/store/toastStore";
import type { AnnouncementType, MediaAttachment } from "@/types/models";
import { toArabicMessage } from "@/utils/errors";

const TYPES: AnnouncementType[] = ["تسجيل", "تنبيه", "نتائج", "عام"];

export default function NewAnnouncementScreen() {
  const client = useQueryClient();
  const logAction = useAdminSettingsStore((state) => state.logAction);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<AnnouncementType>("عام");
  const [image, setImage] = useState("");
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [saving, setSaving] = useState(false);

  const canSave = title.trim().length > 3 && description.trim().length > 5;

  const handleSave = async () => {
    setSaving(true);
    try {
      await addAnnouncement({
        title: title.trim(),
        description: description.trim(),
        type,
        image: image || undefined,
        attachments,
      });
      client.invalidateQueries();
      logAction(`نشر إعلان: ${title.trim()}`);
      showToast("تم نشر الإعلان", "success");
      router.back();
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر نشر الإعلان"), "error");
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

        <ImageField
          label="صورة الإعلان (اختياري)"
          hint="تظهر داخل بطاقة الإعلان."
          value={image}
          onChange={setImage}
          folder="announcements"
        />

        <MediaField
          label="مرفقات الإعلان (اختياري)"
          hint="مقطع فيديو أو تسجيل صوتي أو ملف يُرفق بالإعلان."
          value={attachments}
          onChange={setAttachments}
          folder="announcements"
          tools={["video", "audio", "file"]}
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
