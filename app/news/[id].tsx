import { Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/EmptyState";
import { QueryState } from "@/components/QueryState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography, themed } from "@/constants";
import { NEWS_SCOPE_LABEL } from "@/constants/categories";
import { fetchNewsItem, hasReadNews, markNewsRead } from "@/services/newsService";
import { useRefreshPoints } from "@/hooks/usePoints";
import { showToast } from "@/store/toastStore";
import { toArabicMessage } from "@/utils/errors";
import { formatArabicDate } from "@/utils/date";

/**
 * الخبر كاملًا.
 *
 * ولم تكن هذه الشاشة موجودة: كانت البطاقة تُفتح على رابط المصدر إن وُجد،
 * ولا شيء إن لم يوجد — فالخبر الذي تكتبه الإدارة بنصّها هي، بلا رابط خارجي،
 * كان يُنشر ولا يُقرأ منه إلا سطران في البطاقة. وهذا هو الحال الغالب: أن
 * تكتب القاعدة خبرها بنفسها.
 */
export default function NewsItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    data: item,
    isLoading,
    error,
    refetch,
  } = useQuery({ queryKey: ["news", id], queryFn: () => fetchNewsItem(id) });

  const refreshPoints = useRefreshPoints();
  const read = useQuery({ queryKey: ["news-read", id], queryFn: () => hasReadNews(id) });

  // النقطة لا تُطلب إلا بضغطة: فتحُ الخبر ليس قراءته، ومنحُها بمجرّد الفتح
  // يجعل تمرير القائمة أربح من القراءة.
  const award = useMutation({
    mutationFn: () => markNewsRead(id),
    onSuccess: (result) => {
      void read.refetch();
      refreshPoints();
      showToast(
        result.awarded ? `شكرًا لقراءتك — +${result.pointsEarned} نقطتان` : "قرأتَ هذا الخبر من قبل",
        result.awarded ? "success" : "info"
      );
    },
    onError: (e) => showToast(toArabicMessage(e, "تعذّر تسجيل القراءة"), "error"),
  });

  if (isLoading || error) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="الخبر" />
        <QueryState isLoading={isLoading} error={error} onRetry={() => void refetch()}>
          {null}
        </QueryState>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="الخبر" />
        <EmptyState icon="newspaper-outline" title="لم يعد هذا الخبر منشورًا" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="الخبر" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
        ) : null}

        <View style={styles.metaRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{NEWS_SCOPE_LABEL[item.scope]}</Text>
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {item.source ? `${item.source} · ` : ""}
            {formatArabicDate(item.publishedAt.slice(0, 10))}
          </Text>
        </View>

        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.summary}>{item.summary}</Text>

        {item.body ? <Text style={styles.body}>{item.body}</Text> : null}

        {read.data ? (
          <View style={[styles.readButton, styles.readDone]}>
            <Ionicons name="checkmark-circle" size={19} color={colors.success} />
            <Text style={styles.readDoneText}>قرأتَ هذا الخبر — احتُسبت نقاطه</Text>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="تأكيد قراءة الخبر"
            disabled={award.isPending}
            onPress={() => award.mutate()}
            style={({ pressed }) => [styles.readButton, pressed && styles.pressed]}
          >
            <Ionicons name="checkmark-done-outline" size={19} color={colors.textOnPrimary} />
            <Text style={styles.readText}>قرأتُ الخبر · +2 نقطتان</Text>
          </Pressable>
        )}

        {item.url ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void Linking.openURL(item.url as string)}
            style={({ pressed }) => [styles.sourceButton, pressed && styles.pressed]}
          >
            <Ionicons name="open-outline" size={18} color={colors.primary} />
            <Text style={styles.sourceText}>افتح المصدر</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = themed(() => ({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  image: {
    width: "100%",
    height: 210,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.xs,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: { ...typography.caption, fontSize: 11, color: colors.textPrimary },
  meta: { ...typography.caption, flex: 1, fontSize: 12 },
  title: { ...typography.h2, lineHeight: 34 },
  summary: { ...typography.body, color: colors.textSecondary, lineHeight: 26 },
  body: { ...typography.body, lineHeight: 28, marginTop: spacing.xs },
  readButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  readText: { ...typography.body, color: colors.textOnPrimary, fontFamily: "Tajawal_700Bold" },
  readDone: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  readDoneText: { ...typography.body, color: colors.textSecondary, fontSize: 14 },
  sourceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.75 },
  sourceText: { ...typography.body, color: colors.primary },
}));
