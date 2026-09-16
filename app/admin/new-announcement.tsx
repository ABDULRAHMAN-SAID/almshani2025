import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { BottomSheet } from "@/components/BottomSheet";
import { ScheduleField } from "@/components/ScheduleField";
import { SecondaryButton } from "@/components/SecondaryButton";
import { ImageField } from "@/components/ImageField";
import { MediaField } from "@/components/MediaField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";
import { addAnnouncement, deleteAnnouncement, updateAnnouncement } from "@/services/adminService";
import { useAnnouncements } from "@/hooks/useNotifications";
import { SCHEDULE_LABEL, scheduleState } from "@/utils/visibility";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { showToast } from "@/store/toastStore";
import { CATEGORY_META } from "@/constants/categories";
import type { Announcement, AnnouncementType, ClubKey, MediaAttachment } from "@/types/models";
import { toArabicMessage } from "@/utils/errors";

const TYPES: AnnouncementType[] = ["تسجيل", "تنبيه", "نتائج", "عام"];

/** لمن هذا الإعلان: للقاعدة كلّها، أو لأحد النادييْن. */
const AUDIENCES: { key: ClubKey | "all"; label: string }[] = [
  { key: "all", label: "للجميع" },
  { key: "OfficersClub", label: CATEGORY_META.OfficersClub.label },
  { key: "SeniorNcoClub", label: CATEGORY_META.SeniorNcoClub.label },
];

export default function NewAnnouncementScreen() {
  const client = useQueryClient();
  const logAction = useAdminSettingsStore((state) => state.logAction);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<AnnouncementType>("عام");
  const [image, setImage] = useState("");
  const [audience, setAudience] = useState<ClubKey | "all">("all");
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [schedule, setSchedule] = useState<{ startsAt?: string; endsAt?: string }>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: published } = useAnnouncements();

  const reset = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setType("عام");
    setImage("");
    setAudience("all");
    setAttachments([]);
    setSchedule({});
  };

  const canSave = title.trim().length > 3 && description.trim().length > 5;

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      type,
      image: image || undefined,
      club: audience === "all" ? undefined : audience,
      attachments,
      startsAt: schedule.startsAt,
      endsAt: schedule.endsAt,
    };
    try {
      // البقاء في الشاشة بعد النشر مقصود: القائمة تحته تُظهر ما نُشر فورًا،
      // فيراه ناشره ويعدّله أو يحذفه من مكانه — لا يُدفع إلى شاشة أخرى
      // ليبحث عمّا كتبه للتوّ.
      if (editingId) {
        await updateAnnouncement(editingId, payload);
        logAction(`تعديل إعلان: ${payload.title}`);
        showToast("حُفظ التعديل", "success");
      } else {
        await addAnnouncement(payload);
        logAction(`نشر إعلان: ${payload.title}`);
        showToast("تم نشر الإعلان", "success");
      }
      client.invalidateQueries();
      reset();
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر نشر الإعلان"), "error");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setTitle(announcement.title);
    setDescription(announcement.description);
    setType(announcement.type);
    setImage(announcement.image ?? "");
    setAudience(announcement.club ?? "all");
    setAttachments(announcement.attachments ?? []);
    setSchedule({ startsAt: announcement.startsAt, endsAt: announcement.endsAt });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteAnnouncement(pendingDelete.id);
      logAction(`حذف إعلان: ${pendingDelete.title}`);
      client.invalidateQueries();
      if (editingId === pendingDelete.id) reset();
      showToast("حُذف الإعلان", "success");
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر حذف الإعلان"), "error");
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={editingId ? "تعديل إعلان" : "الإعلانات"} />
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

        <Text style={styles.label}>لمن هذا الإعلان</Text>
        <View style={styles.chipWrap}>
          {AUDIENCES.map((option) => {
            const active = option.key === audience;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                onPress={() => setAudience(option.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.audienceHint}>
          إعلان النادي يظهر داخل صفحة ناديه، وفي قائمة الإعلانات باسم ناديه.
        </Text>

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

        <ScheduleField value={schedule} onChange={setSchedule} />

        <PrimaryButton
          label={editingId ? "احفظ التعديل" : "نشر الإعلان"}
          onPress={handleSave}
          loading={saving}
          disabled={!canSave}
          style={{ marginTop: spacing.lg }}
        />
        {editingId ? (
          <SecondaryButton
            label="إلغاء التعديل"
            onPress={reset}
            style={{ marginTop: spacing.sm }}
          />
        ) : null}

        {/* المنشور تحت المحرّر: يُعدّل ويُحذف من حيث يُنشر. */}
        <Text style={styles.label}>الإعلانات المنشورة ({(published ?? []).length})</Text>
        {(published ?? []).length === 0 ? (
          <Text style={styles.audienceHint}>لا إعلانات بعد.</Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {(published ?? []).map((announcement) => {
              const state = scheduleState(announcement);
              return (
                <View key={announcement.id} style={styles.publishedRow}>
                  <View style={styles.publishedText}>
                    <Text style={styles.publishedTitle} numberOfLines={1}>
                      {announcement.title}
                    </Text>
                    <Text style={[styles.publishedMeta, state !== "live" && styles.publishedMuted]}>
                      {announcement.type} · {SCHEDULE_LABEL[state]}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`تعديل ${announcement.title}`}
                    onPress={() => startEdit(announcement)}
                    style={styles.iconButton}
                  >
                    <Ionicons name="create-outline" size={18} color={colors.primary} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`حذف ${announcement.title}`}
                    onPress={() =>
                      setPendingDelete({ id: announcement.id, title: announcement.title })
                    }
                    style={styles.iconButton}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <BottomSheet visible={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)}>
        <Text style={styles.sheetTitle}>حذف الإعلان</Text>
        <Text style={styles.sheetBody}>
          سيُحذف «{pendingDelete?.title}» نهائيًا من الرئيسية وصفحة الإعلانات.
        </Text>
        <PrimaryButton
          label="حذف نهائيًا"
          onPress={confirmDelete}
          style={{ marginTop: spacing.lg, backgroundColor: colors.danger }}
        />
        <SecondaryButton
          label="تراجع"
          onPress={() => setPendingDelete(null)}
          style={{ marginTop: spacing.sm }}
        />
      </BottomSheet>
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
  audienceHint: { ...typography.caption, fontSize: 11, marginTop: -spacing.xs, lineHeight: 18 },
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
  publishedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  publishedText: { flex: 1, gap: 2 },
  publishedTitle: { ...typography.body, fontSize: 14, fontFamily: "Tajawal_500Medium" },
  publishedMeta: { ...typography.caption, fontSize: 11 },
  publishedMuted: { color: colors.danger },
  iconButton: { padding: spacing.xs },
  sheetTitle: { ...typography.h2, textAlign: "center" },
  sheetBody: { ...typography.bodyMuted, textAlign: "center", marginTop: spacing.sm, lineHeight: 22 },
});
