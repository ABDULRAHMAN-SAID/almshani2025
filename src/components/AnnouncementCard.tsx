import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography, themed } from "@/constants";
import { CATEGORY_META } from "@/constants/categories";
import type { Announcement } from "@/types/models";
import { formatArabicDate } from "@/utils/date";

interface AnnouncementCardProps {
  announcement: Announcement;
  onPress?: () => void;
}

export function AnnouncementCard({ announcement, onPress }: AnnouncementCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {announcement.image ? (
        // صورة الإعلان مكان الأيقونة حين تُرفع: هي ما يميّز إعلانًا عن إعلان
        // في قائمة كلّها أيقونة واحدة.
        <Image source={{ uri: announcement.image }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={styles.iconWrap}>
          <Ionicons name="megaphone-outline" size={18} color={colors.accent} />
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {announcement.title}
        </Text>
        <Text style={styles.date}>
          {announcement.club ? `${CATEGORY_META[announcement.club].label} · ` : ""}
          {formatArabicDate(announcement.publishedAt)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = themed(() => ({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  pressed: { opacity: 0.85 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: "rgba(161,29,44,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  thumb: { width: 52, height: 52, borderRadius: radius.sm, backgroundColor: colors.background },
  content: { flex: 1, gap: 2 },
  title: { ...typography.body, fontFamily: "Tajawal_500Medium" },
  date: { ...typography.caption },
}));
