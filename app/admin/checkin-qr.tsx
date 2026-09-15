import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { QrCode } from "@/components/QrCode";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, radius, spacing, typography } from "@/constants";

/**
 * رمز الحضور بملء الشاشة — يُرفع أمام الحاضرين أو يُطبع ويُعلَّق.
 *
 * الخلفية بيضاء والرمز أسود مهما كان لون التطبيق: القارئ يميّز بالتباين، وكل
 * تلوينٍ هنا يقلّل نسبة المسح الناجح. والرمز النصيّ مكتوب تحته كبيرًا لمن
 * تعطّلت كاميرته أو وقف بعيدًا — والمسار اليدويّ موجود في شاشة الحضور أصلًا.
 */
export default function CheckInQrScreen() {
  const { code, title } = useLocalSearchParams<{ code?: string; title?: string }>();
  const value = (code ?? "").trim().toUpperCase();

  return (
    <View style={styles.screen}>
      <ScreenHeader title="رمز الحضور" />
      <View style={styles.body}>
        {title ? <Text style={styles.activity}>{title}</Text> : null}

        {value ? (
          <>
            <QrCode value={value} size={280} />
            <Text style={styles.code}>{value}</Text>
            <Text style={styles.hint}>
              يمسحه الحاضر من «حسابي ← تسجيل الحضور»، أو يكتبه يدويًّا.
            </Text>
          </>
        ) : (
          <Text style={styles.hint}>لا يوجد رمز محفوظ لهذا النشاط بعد.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg, padding: spacing.xl },
  activity: { ...typography.h3, textAlign: "center" },
  code: {
    ...typography.h1,
    letterSpacing: 6,
    writingDirection: "ltr",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hint: { ...typography.caption, textAlign: "center", lineHeight: 22 },
});
