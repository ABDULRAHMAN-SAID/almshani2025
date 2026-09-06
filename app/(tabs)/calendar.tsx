import { StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/components/EmptyState";
import { colors, spacing, typography } from "@/constants";

/** التقويم السنوي الكامل (عرض شهري + سنوي + فلاتر) — المرحلة 3. */
export default function CalendarScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>التقويم</Text>
      <View style={styles.body}>
        <EmptyState
          icon="calendar-outline"
          title="التقويم السنوي قيد الإعداد"
          subtitle="سيعرض هذا القسم كل الأنشطة والمسابقات والمحاضرات مرتبة حسب الشهر واليوم"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { ...typography.h1, marginBottom: spacing.lg },
  body: { flex: 1, justifyContent: "center" },
});
