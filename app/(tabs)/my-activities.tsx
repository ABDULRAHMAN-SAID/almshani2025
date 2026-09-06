import { StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/components/EmptyState";
import { colors, spacing, typography } from "@/constants";

/** نشاطاتي (القادمة/السابقة/المسابقات/المحاضرات/الرياضة) — المرحلة 2. */
export default function MyActivitiesScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>نشاطاتي</Text>
      <View style={styles.body}>
        <EmptyState
          icon="bookmark-outline"
          title="لم تسجّل في أي نشاط بعد"
          subtitle="الأنشطة التي تسجّل فيها ستظهر هنا"
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
