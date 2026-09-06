import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/components/EmptyState";
import { NotificationCard } from "@/components/NotificationCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, spacing, typography } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications, useRefreshNotifications, useUnreadCount } from "@/hooks/useNotifications";
import { markAllNotificationsRead, markNotificationRead } from "@/services/notificationService";
import { showToast } from "@/store/toastStore";

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { data: notifications } = useNotifications();
  const unread = useUnreadCount();
  const refresh = useRefreshNotifications();

  const handleMarkAll = async () => {
    if (!user || unread === 0) return;
    await markAllNotificationsRead(user.id);
    refresh();
    showToast("تم تعليم كل الإشعارات كمقروءة", "success");
  };

  const handleOpen = async (id: string) => {
    if (!user) return;
    await markNotificationRead(user.id, id);
    refresh();
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="الإشعارات"
        action={
          unread > 0 ? (
            <Pressable accessibilityRole="button" onPress={handleMarkAll} hitSlop={8}>
              <Text style={styles.markAll}>تعليم الكل</Text>
            </Pressable>
          ) : null
        }
      />

      {unread > 0 ? <Text style={styles.unreadLine}>لديك {unread} إشعارات غير مقروءة</Text> : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {notifications && notifications.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onPress={() => handleOpen(notification.id)}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="notifications-outline"
            title="لا توجد إشعارات"
            subtitle="ستصلك إشعارات عند فتح التسجيل في نشاط جديد أو قرب موعد نشاط سجّلت فيه"
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  markAll: { fontFamily: "Tajawal_500Medium", fontSize: 12.5, color: colors.accent },
  unreadLine: { ...typography.caption, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  content: { padding: spacing.lg, paddingTop: spacing.sm },
});
