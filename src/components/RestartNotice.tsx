import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SecondaryButton } from "./SecondaryButton";
import { colors, radius, spacing, typography } from "@/constants";

interface RestartNoticeProps {
  onSkip: () => void;
}

/**
 * تظهر مرّة واحدة، عند أول فتحة بعد التثبيت على هاتف لغته ليست عربية.
 *
 * التطبيق يفرض اتّجاه اليمين إلى اليسار عند الإقلاع، لكنّ أندرويد يقرأ
 * الاتّجاه مرّة واحدة عند إنشاء الشاشة — أي قبل أن يصل الفرض. فأوّل ما يراه
 * العضو الجديد واجهة عربية مقلوبة: الأزرار في غير مواضعها والنصّ من اليسار.
 * وهو أوّل انطباع، ويقع على من لغة هاتفه إنجليزية وهم كثير.
 *
 * ولها مخرج مقصود: لو لم يثبت الفرض على جهاز ما، لبقي صاحبه محبوسًا هنا —
 * وشاشة لا تُغادَر أسوأ من واجهة مقلوبة.
 */
export function RestartNotice({ onSkip }: RestartNoticeProps) {
  return (
    <View style={styles.screen}>
      <View style={styles.icon}>
        <Ionicons name="refresh-outline" size={30} color={colors.primary} />
      </View>
      <Text style={styles.title}>أغلق التطبيق وافتحه</Text>
      <Text style={styles.body}>
        هيّأنا الواجهة للعربية من اليمين إلى اليسار. ولا يكتمل ذلك إلا بفتحة جديدة —
        مرّة واحدة فقط، ثم لا تراها بعدها.
      </Text>
      <View style={styles.card}>
        <Text style={styles.step}>١ — أغلق التطبيق تمامًا (من قائمة التطبيقات المفتوحة)</Text>
        <Text style={styles.step}>٢ — افتحه من جديد</Text>
      </View>
      <SecondaryButton label="متابعة الآن بدون إغلاق" onPress={onSkip} style={styles.skip} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  title: { ...typography.h2, textAlign: "center" },
  body: {
    ...typography.body,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 26,
    color: colors.textMuted,
  },
  card: {
    alignSelf: "stretch",
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  step: { ...typography.body, lineHeight: 30, textAlign: "right" },
  skip: { marginTop: spacing.lg },
});
