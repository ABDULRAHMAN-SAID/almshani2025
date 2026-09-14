import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { BottomSheet } from "@/components/BottomSheet";
import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SecondaryButton } from "@/components/SecondaryButton";
import { colors, radius, spacing, typography } from "@/constants";
import { useNotifications } from "@/hooks/useNotifications";
import { sendNotification } from "@/services/adminService";
import { deleteNotification } from "@/services/notificationService";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { showToast } from "@/store/toastStore";
import type { AppNotification } from "@/types/models";
import { toArabicMessage } from "@/utils/errors";

/** مراجعة الإشعارات المرسلة: حذف ما لم يعد مناسبًا، أو إعادة إرسال إشعار سابق. */
export default function AdminNotificationsScreen() {
  const client = useQueryClient();
  const { data: notifications } = useNotifications();
  const logAction = useAdminSettingsStore((state) => state.logAction);
  const [pendingDelete, setPendingDelete] = useState<AppNotification | null>(null);

  const list = notifications ?? [];

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteNotification(pendingDelete.id);
      logAction(`حذف إشعار: ${pendingDelete.title}`);
      client.invalidateQueries();
      showToast("تم حذف الإشعار", "success");
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر حذف الإشعار"), "error");
    } finally {
      setPendingDelete(null);
    }
  };

  const resend = async (notification: AppNotification) => {
    try {
      await sendNotification(notification.title, notification.body);
      logAction(`إعادة إرسال إشعار: ${notification.title}`);
      client.invalidateQueries();
      showToast("تمت إعادة إرسال الإشعار", "success");
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّرت إعادة الإرسال"), "error");
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="الإشعارات المرسلة"
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="إرسال إشعار جديد"
            onPress={() => router.push("/admin/send-notification")}
            hitSlop={8}
          >
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {list.length === 0 ? (
          <EmptyState
            icon="notifications-outline"
            title="لم تُرسل أي إشعارات بعد"
            subtitle="اضغط + لإرسال أول إشعار"
          />
        ) : (
          list.map((notification) => (
            <View key={notification.id} style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>{notification.title}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`حذف ${notification.title}`}
                  onPress={() => setPendingDelete(notification)}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              </View>
              <Text style={styles.cardBody}>{notification.body}</Text>
              <View style={styles.cardFoot}>
                <Text style={styles.cardDate}>{notification.createdAt}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => resend(notification)}
                  hitSlop={8}
                  style={styles.resend}
                >
                  <Ionicons name="repeat-outline" size={15} color={colors.primary} />
                  <Text style={styles.resendText}>إعادة الإرسال</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <Text style={styles.note}>
          الحذف يزيل الإشعار من مركز الإشعارات لدى المستخدمين. لا يمكن سحب إشعار وصل إلى الهاتف
          كتنبيه، لذلك راجع النص قبل الإرسال.
        </Text>
      </ScrollView>

      <BottomSheet visible={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)}>
        <Text style={styles.sheetTitle}>حذف الإشعار</Text>
        <Text style={styles.sheetBody}>
          سيُحذف «{pendingDelete?.title}» من مركز الإشعارات لدى كل المستخدمين.
        </Text>
        <PrimaryButton
          label="حذف نهائيًا"
          onPress={confirmDelete}
          style={{ marginTop: spacing.lg, backgroundColor: colors.danger }}
        />
        <SecondaryButton
          label="تراجع"
          onPress={() => setPendingDelete(null)}
          style={{ marginTop: spacing.sm }}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  cardTitle: { ...typography.body, fontFamily: "Tajawal_500Medium", flex: 1 },
  cardBody: { ...typography.caption, lineHeight: 20 },
  cardFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  cardDate: { ...typography.caption, fontSize: 12 },
  resend: { flexDirection: "row", alignItems: "center", gap: 4 },
  resendText: { fontFamily: "Tajawal_500Medium", fontSize: 12.5, color: colors.primary },
  note: { ...typography.caption, lineHeight: 20, marginTop: spacing.lg, textAlign: "center" },
  sheetTitle: { ...typography.h2, textAlign: "center" },
  sheetBody: { ...typography.bodyMuted, textAlign: "center", marginTop: spacing.sm, lineHeight: 22 },
});
