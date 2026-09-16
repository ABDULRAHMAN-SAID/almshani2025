import { ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/EmptyState";
import { QueryState } from "@/components/QueryState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography, themed } from "@/constants";
import { fetchChatReports } from "@/services/chatService";
import { formatArabicDate } from "@/utils/date";

/**
 * بلاغات المحادثات الخاصة.
 *
 * والمحادثة نفسها لا تُفتح للإدارة ولا يُقرأ منها شيء: الظاهر هنا رسالةٌ
 * واحدة رفعها صاحبها بنفسه. فمن أُسيء إليه له باب، ولا يصير للإدارة بابٌ
 * إلى محادثات الناس.
 */
export default function AdminChatReportsScreen() {
  const reports = useQuery({ queryKey: ["chat-reports"], queryFn: fetchChatReports });

  return (
    <View style={styles.screen}>
      <ScreenHeader title="بلاغات المحادثات" />
      <QueryState
        isLoading={reports.isLoading}
        error={reports.error}
        onRetry={() => void reports.refetch()}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.hint}>
            كل بلاغ رسالةٌ واحدة رفعها صاحبها. والمحادثات الخاصة لا تُقرأ من الإدارة ولا من
            الخادم — هذه وحدها ما يصل.
          </Text>
          {(reports.data ?? []).length === 0 ? (
            <EmptyState icon="shield-checkmark-outline" title="لا بلاغات" />
          ) : (
            (reports.data ?? []).map((report) => (
              <View key={report.id} style={styles.card}>
                <Text style={styles.body}>{report.body || "(رسالة بلا نصّ)"}</Text>
                <Text style={styles.meta}>
                  {report.reason || "بلا سبب"} · {formatArabicDate(report.createdAt.slice(0, 10))}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </QueryState>
    </View>
  );
}

const styles = themed(() => ({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  hint: { ...typography.caption, lineHeight: 20, marginBottom: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  body: { ...typography.body, fontSize: 14, lineHeight: 22 },
  meta: { ...typography.caption, fontSize: 11 },
}));
