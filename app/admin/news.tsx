import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@/components/EmptyState";
import { FilterChips } from "@/components/FilterChips";
import { FormField } from "@/components/FormField";
import { ImageField } from "@/components/ImageField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScheduleField } from "@/components/ScheduleField";
import { QueryState } from "@/components/QueryState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";
import { NEWS_SCOPE_LABEL } from "@/constants/categories";
import { deleteNews, fetchNews, publishNews, updateNews } from "@/services/newsService";
import { showToast } from "@/store/toastStore";
import type { NewsItem, NewsScope } from "@/types/models";
import { formatArabicDate } from "@/utils/date";
import { toArabicMessage } from "@/utils/errors";
import { SCHEDULE_LABEL, scheduleState } from "@/utils/visibility";

const SCOPES = [
  { key: "oman", label: NEWS_SCOPE_LABEL.oman },
  { key: "world", label: NEWS_SCOPE_LABEL.world },
];

/**
 * نشر الأخبار — للإدارة وحدها.
 *
 * والمصدر حقل مطلوب لا اختياري: خبرٌ يُنشر في تطبيق القاعدة يُقرأ على أنه
 * صادر عنها، وذِكرُ من نقله يفصل بين ما تقوله القاعدة وما تنقله عن غيرها.
 */
export default function AdminNewsScreen() {
  const client = useQueryClient();
  const scroller = useRef<ScrollView>(null);
  // معرّف الخبر قيد التعديل، أو null للنشر الجديد. حالةٌ واحدة تكفي: النموذج
  // هو هو، والفرق أين يذهب ما فيه.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scope, setScope] = useState<NewsScope>("oman");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [source, setSource] = useState("");
  const [url, setUrl] = useState("");
  const [image, setImage] = useState("");
  const [schedule, setSchedule] = useState<{ startsAt?: string; endsAt?: string }>({});

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["news"],
    queryFn: () => fetchNews(),
  });

  const canPublish =
    title.trim().length > 5 && summary.trim().length > 10 && source.trim().length > 1;

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setSummary("");
    setBody("");
    setUrl("");
    setImage("");
    setSchedule({});
  };

  const startEditing = (item: NewsItem) => {
    setEditingId(item.id);
    setScope(item.scope);
    setTitle(item.title);
    setSummary(item.summary);
    setBody(item.body ?? "");
    setSource(item.source ?? "");
    setUrl(item.url ?? "");
    setImage(item.image ?? "");
    setSchedule({ startsAt: item.startsAt, endsAt: item.endsAt });
    // النموذج أعلى الشاشة والقائمة أسفلها: بلا هذا يضغط المحرّر «تعديل»
    // فلا يرى شيئًا يتغيّر، والحقول امتلأت فوق ما يراه.
    scroller.current?.scrollTo({ y: 0, animated: true });
  };

  const publish = useMutation({
    mutationFn: () =>
      editingId
        ? updateNews(editingId, { title, summary, body, scope, source, url, image, ...schedule })
        : publishNews({ title, summary, body, scope, source, url, image, ...schedule }),
    onSuccess: () => {
      const wasEditing = editingId !== null;
      resetForm();
      // إبطالٌ شامل كما في بقيّة شاشات الإدارة.
      //
      // كان مقصورًا على المفتاح "news"، والصفحة الرئيسية تقرأ الأخبار بمفتاح
      // آخر ("latest-news") — فمن نشر خبرًا رآه في هذه الشاشة وحدها، ولم يجده
      // في الرئيسية ولا في صفحة الأخبار، فظنّ أن النشر لم يقع.
      void client.invalidateQueries();
      showToast(
        wasEditing ? "حُفظ التعديل" : "نُشر الخبر — تجده في الصفحة الرئيسية",
        "success"
      );
    },
    onError: (e) =>
      showToast(toArabicMessage(e, editingId ? "تعذّر حفظ التعديل" : "تعذّر نشر الخبر"), "error"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteNews(id),
    onSuccess: () => {
      void client.invalidateQueries();
      showToast("حُذف الخبر");
    },
    onError: (e) => showToast(toArabicMessage(e, "تعذّر الحذف"), "error"),
  });

  return (
    <View style={styles.screen}>
      <ScreenHeader title="الأخبار" />
      <ScrollView
        ref={scroller}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>{editingId ? "تعديل خبر منشور" : "خبر جديد"}</Text>
        <View style={styles.card}>
          <FilterChips items={SCOPES} activeKey={scope} onChange={(k) => setScope(k as NewsScope)} />
          <FormField label="العنوان" value={title} onChangeText={setTitle} placeholder="عنوان الخبر" />
          <FormField
            label="الملخّص"
            value={summary}
            onChangeText={setSummary}
            placeholder="سطران يوضّحان الخبر"
            multiline
          />
          <FormField
            label="التفاصيل (اختياري)"
            value={body}
            onChangeText={setBody}
            placeholder="نصّ الخبر كاملًا"
            multiline
          />
          <FormField label="المصدر" value={source} onChangeText={setSource} placeholder="وكالة الأنباء العُمانية" />
          <FormField
            label="رابط المصدر (اختياري)"
            value={url}
            onChangeText={setUrl}
            placeholder="https://"
            autoCapitalize="none"
          />
          <ImageField
            label="صورة الخبر (اختياري)"
            hint="تظهر فوق الخبر في الصفحة الرئيسية"
            value={image}
            onChange={setImage}
            folder="news"
          />
          <ScheduleField value={schedule} onChange={setSchedule} />
          <PrimaryButton
            label={editingId ? "احفظ التعديل" : "نشر الخبر"}
            onPress={() => publish.mutate()}
            disabled={!canPublish}
            loading={publish.isPending}
          />
          {editingId ? (
            <Pressable accessibilityRole="button" onPress={resetForm} hitSlop={8}>
              <Text style={styles.cancelEdit}>إلغاء التعديل والعودة إلى خبر جديد</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>المنشور</Text>
        <QueryState isLoading={isLoading} error={error} onRetry={() => void refetch()}>
          {(data ?? []).length > 0 ? (
            (data ?? []).map((item) => (
              <View key={item.id} style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {NEWS_SCOPE_LABEL[item.scope]} · {item.source} ·{" "}
                    {formatArabicDate(item.publishedAt.slice(0, 10))}
                    {scheduleState(item) !== "live" ? ` · ${SCHEDULE_LABEL[scheduleState(item)]}` : ""}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`تعديل ${item.title}`}
                  onPress={() => startEditing(item)}
                  hitSlop={8}
                >
                  <Ionicons name="create-outline" size={20} color={colors.primary} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`حذف ${item.title}`}
                  onPress={() => remove.mutate(item.id)}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={19} color={colors.danger} />
                </Pressable>
              </View>
            ))
          ) : (
            <EmptyState icon="newspaper-outline" title="لم يُنشر خبر بعد" />
          )}
        </QueryState>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  sectionLabel: { ...typography.caption, marginTop: spacing.sm },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { ...typography.body, lineHeight: 24 },
  rowMeta: { ...typography.caption, fontSize: 11 },
  cancelEdit: { ...typography.caption, color: colors.primary, textAlign: "center" },
});
