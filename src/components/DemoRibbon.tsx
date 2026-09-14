import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "@/constants";
import { USE_MOCK_DATA } from "@/services/config";

/**
 * شريط يعلن أن هذه نسخة عرض، ولا يغيب عن أي شاشة.
 *
 * بلا خادم يقبل التطبيق أي كلمة مرور وأي رمز تأكيد، لأن لا أحد هناك ليقول لا.
 * وكان يفعل ذلك صامتًا — فيظنّ من جرّبه أن الحساب أُنشئ وأن الرمز وصل وأن كل
 * ما يكتبه محفوظ، ولا شيء من ذلك يقع. الصمت هنا خداع، فلا نسكت.
 *
 * ويختفي الشريط وحده في النسخة الحقيقية: شرطه هو المفتاح نفسه الذي يحوّل
 * التطبيق إلى الخادم.
 */
export function DemoRibbon() {
  if (!USE_MOCK_DATA) return null;

  return (
    <View style={styles.bar}>
      <Ionicons name="flask-outline" size={15} color={colors.textOnPrimary} />
      <Text style={styles.text}>نسخة عرض — بلا خادم. لا شيء يُحفظ، وأي رمز يُقبل.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.danger,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  text: {
    ...typography.caption,
    color: colors.textOnPrimary,
    fontFamily: "Tajawal_500Medium",
    fontSize: 11,
  },
});
