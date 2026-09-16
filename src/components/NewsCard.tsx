import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors, radius, spacing, typography, themed } from "@/constants";
import { NEWS_SCOPE_LABEL } from "@/constants/categories";
import type { NewsItem } from "@/types/models";
import { relativeDayLabel } from "@/utils/date";

interface NewsCardProps {
  item: NewsItem;
  onPress?: () => void;
  /** بطاقة ضيّقة بعرض ثابت، لصفّ أفقي لا لعمود. */
  compact?: boolean;
}

/**
 * بطاقة خبر واحد: النطاق والمصدر ووقته، ثم العنوان والملخّص.
 *
 * والمصدر ظاهر دائمًا لا مخفيًّا في التفاصيل: خبرٌ في تطبيق رسمي يُقرأ على
 * أنه صادر عن القاعدة، وذِكرُ من نقله يفصل بين ما تنشره وما تنقله.
 */
export function NewsCard({ item, onPress, compact }: NewsCardProps) {
  // اللمسة تفتح الخبر داخل التطبيق، لا رابط المصدر في المتصفّح.
  //
  // كانت البطاقة تُفتح على الرابط الخارجي إن وُجد، فإن لم يوجد لم تُفتح على
  // شيء — والخبر الذي تكتبه الإدارة بنصّها لا رابط له، فكان يُنشر ولا يُقرأ
  // منه إلا سطران. والمصدر يبقى مذكورًا، ويُفتح من داخل صفحة الخبر.
  const open = onPress ?? (() => router.push(`/news/${item.id}`));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`اقرأ الخبر: ${item.title}`}
      onPress={open}
      style={({ pressed }) => [
        styles.card,
        compact ? styles.cardCompact : null,
        pressed ? styles.pressed : null,
      ]}
    >
      {item.image ? (
        // الصورة فوق النصّ لا خلفه: خبرٌ يُقرأ عنوانه أوّلًا، والصورة تشرح
        // ولا تزاحم. وresizeMode يقصّ ولا يشوّه مهما كانت أبعاد ما رُفع.
        <Image
          source={{ uri: item.image }}
          style={[styles.image, compact ? styles.imageCompact : null]}
          resizeMode="cover"
        />
      ) : null}

      <View style={styles.top}>
        <View style={[styles.badge, item.scope === "oman" ? styles.badgeOman : styles.badgeWorld]}>
          <Text style={styles.badgeText}>{NEWS_SCOPE_LABEL[item.scope]}</Text>
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {item.source ? `${item.source} · ` : ""}
          {relativeDayLabel(item.publishedAt.slice(0, 10))}
        </Text>
      </View>

      <Text style={[styles.title, compact ? styles.titleCompact : null]} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.summary} numberOfLines={compact ? 2 : 3}>
        {item.summary}
      </Text>

      <View style={styles.more}>
        <Ionicons name="chevron-back" size={14} color={colors.primary} />
        <Text style={styles.moreText}>اقرأ الخبر</Text>
      </View>
    </Pressable>
  );
}

const styles = themed(() => ({
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  // الصفّ الأفقي في الصفحة الرئيسية: عرضٌ ثابت لتُرى حافّةُ التالية فيُعرف
  // أن الصفّ يُسحب. وبلا هذا كانت الأخبار عمودًا يبتلع الشاشة كلّها،
  // فيُدفن ما تحته من أقسام.
  cardCompact: { width: 268, padding: spacing.md },
  imageCompact: { height: 132 },
  titleCompact: { fontSize: 15, lineHeight: 24 },
  pressed: { opacity: 0.75 },
  image: {
    width: "100%",
    height: 160,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.background,
  },
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
}));
