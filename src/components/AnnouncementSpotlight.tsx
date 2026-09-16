import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing, typography } from "@/constants";
import type { Announcement } from "@/types/models";

interface AnnouncementSpotlightProps {
  announcement: Announcement;
  onPress: () => void;
}

/**
 * الإعلان في أعلى الصفحة، بلونٍ يخالف ما حوله.
 *
 * وكان يُعرض بطاقةً بين البطاقات أسفل الأنشطة، فيمرّ عليه النظر كما يمرّ على
 * نشاطٍ في قائمة — والإعلان ليس صنفًا من المحتوى يُتصفَّح، بل خبرٌ يُراد أن
 * يبلغ الناس اليوم: «التسجيل مفتوح حتى الخميس» يُقرأ الخميس أو لا يُقرأ.
 */
export function AnnouncementSpotlight({ announcement, onPress }: AnnouncementSpotlightProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`إعلان: ${announcement.title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, shadow.card, pressed && styles.pressed]}
    >
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons name="megaphone" size={18} color={colors.textOnPrimary} />
        </View>
        <Text style={styles.badge}>{announcement.type}</Text>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {announcement.title}
      </Text>
      <Text style={styles.body} numberOfLines={3}>
        {announcement.description}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.more}>اقرأ الإعلان</Text>
        <Ionicons name="chevron-back" size={15} color={colors.textOnPrimary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg + 2,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  pressed: { opacity: 0.92 },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  icon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    ...typography.caption,
    color: colors.textOnPrimary,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  title: { ...typography.h3, color: colors.textOnPrimary },
  body: { ...typography.body, fontSize: 13, lineHeight: 21, color: "rgba(255,255,255,0.88)" },
  footer: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: 2 },
  more: { ...typography.caption, color: colors.textOnPrimary },
});
