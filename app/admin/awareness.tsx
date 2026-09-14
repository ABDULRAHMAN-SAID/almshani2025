import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BottomSheet } from "@/components/BottomSheet";
import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SecondaryButton } from "@/components/SecondaryButton";
import { colors, radius, spacing, typography } from "@/constants";
import { deleteAwarenessArticle, publishAwarenessArticle } from "@/services/adminService";
import { fetchAwarenessLibrary } from "@/services/awarenessService";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { showToast } from "@/store/toastStore";
import { toArabicMessage } from "@/utils/errors";

const CATEGORIES = [
  { key: "أمني", label: "التثقيف الأمني", icon: "shield-checkmark-outline" as const, tint: "#434190" },
  { key: "مكافحة المخدرات", label: "مكافحة المخدرات", icon: "leaf-outline" as const, tint: "#276749" },
  { key: "السلامة", label: "السلامة", icon: "medkit-outline" as const, tint: "#B7791F" },
];

/** إدارة المحتوى التوعوي: نشر مقال عام أو حذف مقال منشور. */
export default function AdminAwarenessScreen() {
  const client = useQueryClient();
  const { data: articles } = useQuery({ queryKey: ["awareness-library"], queryFn: fetchAwarenessLibrary });

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].key);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);
  const logAction = useAdminSettingsStore((state) => state.logAction);

  const canPublish =
    title.trim().length > 3 && summary.trim().length > 10 && content.trim().length > 30;

  const handlePublish = async () => {
    if (!canPublish) {
      showToast("أكمل العنوان والملخص ونص المقال", "error");
      return;
    }
    setSaving(true);
    try {
      await publishAwarenessArticle({
        title: title.trim(),
        summary: summary.trim(),
        content: content.trim(),
        category,
      });
      setTitle("");
      setSummary("");
      setContent("");
      client.invalidateQueries();
      logAction(`نشر مقال توعوي: ${title.trim()}`);
      showToast("تم نشر المقال التوعوي", "success");
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر نشر المقال"), "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteAwarenessArticle(pendingDelete.id);
      logAction(`حذف مقال توعوي: ${pendingDelete.title}`);
      client.invalidateQueries();
      showToast("تم حذف المقال", "success");
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر حذف المقال"), "error");
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="المحتوى التوعوي" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.guardCard}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.guardText}>
            المحتوى التوعوي عام فقط: إرشادات سلوكية للتوعية الأمنية ومكافحة المخدرات والسلامة، بلا أي
            تفاصيل تشغيلية أو مواقع أو معلومات غير مصرّح بنشرها.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>مقال جديد</Text>
        <Field label="العنوان" value={title} onChange={setTitle} placeholder="مثال: كلمات المرور القوية" />
        <Field
          label="الملخص"
          value={summary}
          onChange={setSummary}
          placeholder="سطر أو سطران يظهران في البطاقة"
          multiline
        />
        <Field
          label="نص المقال"
          value={content}
          onChange={setContent}
          placeholder="النص الكامل الذي يقرأه المستخدم"
          tall
        />

        <Text style={styles.label}>التصنيف</Text>
        <View style={styles.chipWrap}>
          {CATEGORIES.map((item) => {
            const active = item.key === category;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setCategory(item.key)}
                style={[styles.chip, active && { backgroundColor: item.tint, borderColor: item.tint }]}
              >
                <Ionicons
                  name={item.icon}
                  size={15}
                  color={active ? colors.textOnPrimary : colors.textMuted}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <PrimaryButton
          label="نشر المقال"
          onPress={handlePublish}
          loading={saving}
          disabled={!canPublish}
          style={{ marginTop: spacing.lg }}
        />

        <Text style={styles.sectionLabel}>المقالات المنشورة ({(articles ?? []).length})</Text>
        {(articles ?? []).length === 0 ? (
          <EmptyState icon="bulb-outline" title="لا توجد مقالات منشورة" />
        ) : (
          <View style={styles.listCard}>
            {(articles ?? []).map((article, index) => {
              const meta = CATEGORIES.find((item) => item.key === article.category) ?? CATEGORIES[0];
              return (
                <View key={article.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <View style={styles.row}>
                    <Ionicons name={meta.icon} size={18} color={meta.tint} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {article.title}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {article.category} · {article.publishedAt}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`حذف ${article.title}`}
                      onPress={() => setPendingDelete({ id: article.id, title: article.title })}
                      hitSlop={8}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <BottomSheet visible={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)}>
        <Text style={styles.sheetTitle}>حذف المقال</Text>
        <Text style={styles.sheetBody}>
          سيُحذف «{pendingDelete?.title}» نهائيًا من مكتبة التوعية.
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

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  tall,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  tall?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, (multiline || tall) && styles.inputMultiline, tall && { height: 160 }]}
        multiline={multiline || tall}
        textAlign="right"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl },
  guardCard: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  guardText: { ...typography.caption, flex: 1, lineHeight: 20 },
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
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipText: { fontFamily: "Tajawal_500Medium", fontSize: 12.5, color: colors.textMuted },
  chipTextActive: { color: colors.textOnPrimary },
  listCard: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  rowTitle: { ...typography.body, fontFamily: "Tajawal_500Medium" },
  rowMeta: { ...typography.caption, fontSize: 12 },
  divider: { height: 1, backgroundColor: colors.border },
  sheetTitle: { ...typography.h2, textAlign: "center" },
  sheetBody: { ...typography.bodyMuted, textAlign: "center", marginTop: spacing.sm, lineHeight: 22 },
});
