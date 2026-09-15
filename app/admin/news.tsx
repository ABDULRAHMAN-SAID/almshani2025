import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@/components/EmptyState";
import { FilterChips } from "@/components/FilterChips";
import { FormField } from "@/components/FormField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { QueryState } from "@/components/QueryState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";
import { deleteNews, fetchNews, publishNews } from "@/services/newsService";
import { showToast } from "@/store/toastStore";
import type { NewsScope } from "@/types/models";
import { formatArabicDate } from "@/utils/date";
import { toArabicMessage } from "@/utils/errors";

const SCOPES = [
  { key: "oman", label: "عُمان" },
  { key: "world", label: "عالمي" },
];

/**
 * نشر الأخبار — للإدارة وحدها.
 *
 * والمصدر حقل مطلوب لا اختياري: خبرٌ يُنشر في تطبيق القاعدة يُقرأ على أنه
 * صادر عنها، وذِكرُ من نقله يفصل بين ما تقوله القاعدة وما تنقله عن غيرها.
 */
export default function AdminNewsScreen() {
  const client = useQueryClient();
  const [scope, setScope] = useState<NewsScope>("oman");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [source, setSource] = useState("");
  const [url, setUrl] = useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["news"],
    queryFn: () => fetchNews(),
  });

  const canPublish =
    title.trim().length > 5 && summary.trim().length > 10 && source.trim().length > 1;

  const publish = useMutation({
    mutationFn: () => publishNews({ title, summary, body, scope, source, url }),
    onSuccess: () => {
      setTitle("");
      setSummary("");
      setBody("");
      setUrl("");
      void client.invalidateQueries({ queryKey: ["news"] });
      showToast("نُشر الخبر", "success");
    },
    onError: (e) => showToast(toArabicMessage(e, "تعذّر نشر الخبر"), "error"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteNews(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["news"] });
      showToast("حُذف الخبر");
    },
    onError: (e) => showToast(toArabicMessage(e, "تعذّر الحذف"), "error"),
  });

  return (
    <View style={styles.screen}>
      <ScreenHeader title="الأخبار" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>خبر جديد</Text>
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
          <PrimaryButton
            label="نشر الخبر"
            onPress={() => publish.mutate()}
            disabled={!canPublish}
            loading={publish.isPending}
          />
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
                    {item.scope === "oman" ? "عُمان" : "عالمي"} · {item.source} ·{" "}
                    {formatArabicDate(item.publishedAt.slice(0, 10))}
                  </Text>
                </View>
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
});
