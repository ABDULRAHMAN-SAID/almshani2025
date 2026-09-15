import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "@/constants";
import type { NewsItem } from "@/types/models";
import { relativeDayLabel } from "@/utils/date";

interface NewsCardProps {
  item: NewsItem;
  onPress?: () => void;
}

const SCOPE_LABEL: Record<NewsItem["scope"], string> = {
  oman: "عُمان",
  world: "عالمي",
};

/**
 * بطاقة خبر واحد: النطاق والمصدر ووقته، ثم العنوان والملخّص.
 *
 * والمصدر ظاهر دائمًا لا مخفيًّا في التفاصيل: خبرٌ في تطبيق رسمي يُقرأ على
 * أنه صادر عن القاعدة، وذِكرُ من نقله يفصل بين ما تنشره وما تنقله.
 */
export function NewsCard({ item, onPress }: NewsCardProps) {
  const open = onPress ?? (item.url ? () => void Linking.openURL(item.url as string) : undefined);

  return (
    <Pressable
      accessibilityRole={open ? "button" : undefined}
      onPress={open}
      style={({ pressed }) => [styles.card, pressed && open ? styles.pressed : null]}
    >
      <View style={styles.top}>
        <View style={[styles.badge, item.scope === "oman" ? styles.badgeOman : styles.badgeWorld]}>
          <Text style={styles.badgeText}>{SCOPE_LABEL[item.scope]}</Text>
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {item.source ? `${item.source} · ` : ""}
          {relativeDayLabel(item.publishedAt.slice(0, 10))}
        </Text>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.summary} numberOfLines={2}>
        {item.summary}
      </Text>

      {item.url ? (
        <View style={styles.more}>
          <Ionicons name="open-outline" size={14} color={colors.primary} />
          <Text style={styles.moreText}>المصدر</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  pressed: { opacity: 0.75 },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  badgeOman: { backgroundColor: colors.successSoft ?? colors.background },
  badgeWorld: { backgroundColor: colors.background },
  badgeText: { ...typography.caption, fontSize: 11, color: colors.textPrimary },
  meta: { ...typography.caption, flex: 1, fontSize: 11 },
  title: { ...typography.h3, fontSize: 16, lineHeight: 26 },
  summary: { ...typography.caption, lineHeight: 21 },
  more: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  moreText: { ...typography.caption, color: colors.primary, fontSize: 12 },
});
