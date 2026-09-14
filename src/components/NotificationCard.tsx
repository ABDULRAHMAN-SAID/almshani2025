import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "@/constants";
import type { AppNotification } from "@/types/models";
import { formatArabicDate } from "@/utils/date";

interface NotificationCardProps {
  notification: AppNotification;
  onPress?: () => void;
}

export function NotificationCard({ notification, onPress }: NotificationCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {!notification.read ? <View style={styles.dot} /> : null}
      <View style={styles.iconWrap}>
        <Ionicons name="notifications-outline" size={18} color={colors.primary} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, !notification.read && styles.unreadTitle]} numberOfLines={2}>
          {notification.title}
        </Text>
        <Text style={styles.body} numberOfLines={2}>
          {notification.body}
        </Text>
        <Text style={styles.date}>{formatArabicDate(notification.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
    position: "relative",
  },
  pressed: { opacity: 0.85 },
  dot: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1, gap: 2 },
  title: { ...typography.body },
  unreadTitle: { fontFamily: "Tajawal_500Medium" },
  body: { ...typography.bodyMuted },
  date: { ...typography.caption, marginTop: 2 },
});
