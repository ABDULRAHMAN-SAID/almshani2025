import { Image, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "@/constants";
import type { ClubMenu } from "@/types/models";
import { formatArabicDate, parseIsoDate } from "@/utils/date";

interface ClubMenuCardProps {
  menu: ClubMenu;
}

/** أحد الأسبوع اليوم؟ — لنقول «هذا الأسبوع» بدل تاريخٍ يُحسب. */
function weekLabel(weekStart: string): string {
  const start = parseIsoDate(weekStart);
  const now = new Date();
  const thisSunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const diffWeeks = Math.round((start.getTime() - thisSunday.getTime()) / (7 * 86_400_000));
  if (diffWeeks === 0) return "قائمة هذا الأسبوع";
  if (diffWeeks === -1) return "قائمة الأسبوع الماضي";
  return `قائمة أسبوع ${formatArabicDate(weekStart)}`;
}

/**
 * قائمة طعام النادي لأسبوع: صورها كما رُفعت.
 *
 * والصورة هي القائمة نفسها — الورقة المعلّقة على الباب — لا شرحٌ لها. فلا
 * عنوان فوق كل صورة ولا جدولٌ تحتها: ما يُقرأ في الورقة يُقرأ في صورتها.
 */
export function ClubMenuCard({ menu }: ClubMenuCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons name="restaurant-outline" size={18} color={colors.accent} />
        </View>
        <Text style={styles.title}>{weekLabel(menu.weekStart)}</Text>
      </View>

      {menu.images.map((image) => (
        <Image key={image} source={{ uri: image }} style={styles.image} resizeMode="contain" />
      ))}

      {menu.images.length === 0 ? (
        <Text style={styles.empty}>لم تُرفع صور هذه القائمة بعد.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: "rgba(161,29,44,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { ...typography.body, flex: 1, fontFamily: "Tajawal_700Bold" },
  // الورقة المصوّرة طويلة: contain لا cover، فقصُّ أعلاها وأسفلها يُخفي أيامًا.
  image: { width: "100%", height: 420, borderRadius: radius.md, backgroundColor: colors.background },
  empty: { ...typography.caption },
});
