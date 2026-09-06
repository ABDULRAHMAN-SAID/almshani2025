import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { AwarenessCard } from "@/components/AwarenessCard";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/SectionHeader";
import { colors, spacing, typography } from "@/constants";
import { MOCK_AWARENESS } from "@/services/mockData";
import { showToast } from "@/store/toastStore";

async function fetchAwarenessList() {
  return MOCK_AWARENESS;
}

/** التثقيف الأمني — بطاقات قصيرة وواضحة، بدون مقالات طويلة. */
export default function AwarenessScreen() {
  const { data, isLoading } = useQuery({ queryKey: ["awareness-list"], queryFn: fetchAwarenessList });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>التوعية</Text>

      <View style={styles.section}>
        <SectionHeader title="التثقيف الأمني" />
        {isLoading ? null : data && data.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            {data.map((article) => (
              <AwarenessCard
                key={article.id}
                article={article}
                onPress={() => showToast("سيتم عرض المقال الكامل في مرحلة قادمة")}
              />
            ))}
          </View>
        ) : (
          <EmptyState title="لا يوجد محتوى توعوي حاليًا" />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="مكافحة المخدرات" />
        <EmptyState
          icon="leaf-outline"
          title="سيتم إضافة الحملات التوعوية قريبًا"
          subtitle="أضرار المخدرات، علامات الخطر، وطرق الوقاية"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { ...typography.h1, marginBottom: spacing.lg },
  section: { marginBottom: spacing.xl },
});
