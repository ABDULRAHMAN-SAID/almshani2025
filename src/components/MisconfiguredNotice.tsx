import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "@/constants";

/**
 * شاشة حاجزة تظهر حين يُبنى التطبيق للعمل على الخادم الحقيقي لكنه خرج بلا
 * مفاتيح الخادم.
 *
 * بدونها يعمل التطبيق بمفاتيح شكلية، فتفشل كل شاشة على حدة برسالة شبكة غامضة،
 * ويبدو العطل كأنه ضعف إنترنت عند المستخدم. الوقوف هنا مرة واحدة برسالة واحدة
 * صريحة أصدق من عشرين رسالة خاطئة.
 */
export function MisconfiguredNotice() {
  return (
    <View style={styles.screen}>
      <View style={styles.icon}>
        <Ionicons name="unlink-outline" size={30} color={colors.danger} />
      </View>
      <Text style={styles.title}>هذه النسخة غير مربوطة بالخادم</Text>
      <Text style={styles.body}>
        بُني التطبيق ليعمل على البيانات الحقيقية، لكن مفاتيح الخادم لم تدخل في نسخة البناء،
        فلا يستطيع تسجيل الدخول ولا قراءة أي بيانات.
      </Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>الإصلاح على حاسوب البناء</Text>
        <Text style={styles.step}>
          <Text style={styles.mono}>npm run connect</Text>  — يضع رابط المشروع والمفتاح العام
        </Text>
        <Text style={styles.step}>
          <Text style={styles.mono}>npm run make-app</Text>  — يبني نسخة جديدة بها المفاتيح
        </Text>
      </View>
      <Text style={styles.footnote}>ثم وزّع الملف الجديد بدل هذا.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { ...typography.h2, textAlign: "center" },
  body: { ...typography.body, textAlign: "center", lineHeight: 25, color: colors.textSecondary },
  card: {
    alignSelf: "stretch",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cardTitle: { ...typography.body, fontFamily: "Tajawal_700Bold", fontSize: 14 },
  step: { ...typography.caption, lineHeight: 22, color: colors.textSecondary },
  mono: { fontFamily: "Tajawal_700Bold", color: colors.marineDeep },
  footnote: { ...typography.caption, color: colors.textMuted, textAlign: "center" },
});
