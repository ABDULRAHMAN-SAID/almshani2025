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
 * قائمة طعام النادي لأسبوع.
 *
 * الصورة أوّلًا حين تُرفع: الغالب أن تُصوَّر الورقة المعلّقة على الباب، وقراءة
 * الصورة أسرع من قراءة جدول أُعيد كتابته. والأيام تحتها لمن كتبها، ولمن
 * يقرأ بخط كبير أو يبحث بالكلمة.
 */
export function ClubMenuCard({ menu }: ClubMenuCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons name="restaurant-outline" size={18} color={colors.accent} />
        </View>
        <View style={styles.headText}>
          <Text style={styles.title}>{weekLabel(menu.weekStart)}</Text>
          {menu.note ? <Text style={styles.note}>{menu.note}</Text> : null}
        </View>
      </View>

      {menu.image ? (
        <Image source={{ uri: menu.image }} style={styles.image} resizeMode="cover" />
      ) : null}

      {menu.days.length > 0 ? (
        <View style={styles.days}>
          {menu.days.map((entry) => (
            <View key={entry.day} style={styles.dayRow}>
              <Text style={styles.dayName}>{entry.day}</Text>
              <Text style={styles.dayMeal}>{entry.meal}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {!menu.image && menu.days.length === 0 ? (
        <Text style={styles.empty}>لم تُضف تفاصيل هذه القائمة بعد.</Text>
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
  headText: { flex: 1, gap: 2 },
  title: { ...typography.body, fontFamily: "Tajawal_700Bold" },
  note: { ...typography.caption, fontSize: 11 },
  image: { width: "100%", height: 200, borderRadius: radius.md, backgroundColor: colors.background },
  days: { gap: spacing.xs },
  dayRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  dayName: { ...typography.caption, width: 62, color: colors.textPrimary },
  dayMeal: { ...typography.body, flex: 1, fontSize: 14, lineHeight: 24 },
  empty: { ...typography.caption },
});
