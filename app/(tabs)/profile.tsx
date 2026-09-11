import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "@/components/BottomSheet";
import { FormField } from "@/components/FormField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { colors, radius, spacing, typography } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { usePointsBalance } from "@/hooks/usePoints";
import { useUnreadCount } from "@/hooks/useNotifications";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { useRegistrationStore } from "@/store/registrationStore";
import { changePassword, updateFullName } from "@/services/authService";
import { showToast } from "@/store/toastStore";
import { toArabicMessage } from "@/utils/errors";

export default function ProfileScreen() {
  const { user, updateName, signOut } = useAuth();
  const points = usePointsBalance();
  const unread = useUnreadCount();
  const registeredCount = useRegistrationStore((state) => state.registeredIds.length);
  const discussionEnabled = useAdminSettingsStore((state) => state.discussionEnabled);
  const messagesEnabled = useAdminSettingsStore((state) => state.messagesEnabled);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const openEdit = () => {
    setNameDraft(user?.name ?? "");
    setEditing(true);
  };

  const handleSave = async () => {
    if (!user || nameDraft.trim().length < 3) {
      showToast("الرجاء إدخال اسم صحيح", "error");
      return;
    }
    setSaving(true);
    try {
      await updateFullName(user.id, nameDraft.trim());
      updateName(nameDraft.trim());
      setEditing(false);
      showToast("تم تحديث الاسم بنجاح", "success");
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر تحديث الاسم"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      showToast("كلمة المرور قصيرة — ستة أحرف على الأقل", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("كلمتا المرور غير متطابقتين", "error");
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(newPassword);
      setChangingPassword(false);
      setNewPassword("");
      setConfirmPassword("");
      showToast("تم تغيير كلمة المرور", "success");
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر تغيير كلمة المرور"), "error");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSignOut = () => {
    signOut();
    router.replace("/(auth)/login");
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>حسابي</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={28} color={colors.primary} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.phone}>{user?.phone}</Text>
          {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
        </View>
        <Pressable accessibilityRole="button" onPress={openEdit} hitSlop={8}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.list}>
        <Row icon="star-outline" label="نقاطي" value={String(points.data ?? 0)} onPress={() => router.push("/points-history")} />
        <Row icon="podium-outline" label="قائمة المتصدرين" onPress={() => router.push("/leaderboard")} />
        <Row icon="qr-code-outline" label="تسجيل الحضور" onPress={() => router.push("/check-in")} />
        <Row
          icon="trophy-outline"
          label="الأنشطة المسجل فيها"
          value={String(registeredCount)}
          onPress={() => router.push("/(tabs)/my-activities")}
        />
        <Row icon="search-outline" label="البحث" onPress={() => router.push("/search")} />
        {discussionEnabled ? (
          <Row
            icon="chatbubbles-outline"
            label="المجموعات النقاشية"
            onPress={() => router.push("/groups")}
          />
        ) : null}
        {messagesEnabled ? (
          <Row icon="mail-outline" label="رسائلي مع الإدارة" onPress={() => router.push("/my-messages")} />
        ) : null}
        <Row icon="call-outline" label="تواصل معنا" onPress={() => router.push("/contact")} />
        <Row
          icon="notifications-outline"
          label="الإشعارات"
          value={unread > 0 ? String(unread) : undefined}
          onPress={() => router.push("/notifications")}
        />
        <Row
          icon="key-outline"
          label="تغيير كلمة المرور"
          onPress={() => setChangingPassword(true)}
        />
        <Row icon="settings-outline" label="الإعدادات" onPress={() => router.push("/settings")} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="لوحة الإدارة"
        onLongPress={() => router.push("/admin")}
        delayLongPress={800}
        style={styles.adminHint}
      >
        <Text style={styles.adminHintText}>أنشطتي — قاعدة صلالة الجوية</Text>
      </Pressable>

      <Pressable accessibilityRole="button" onPress={handleSignOut} style={styles.signOut}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.signOutLabel}>تسجيل الخروج</Text>
      </Pressable>

      <BottomSheet visible={editing} onClose={() => setEditing(false)}>
        <Text style={styles.sheetTitle}>تعديل الاسم</Text>
        <TextInput
          value={nameDraft}
          onChangeText={setNameDraft}
          style={styles.sheetInput}
          textAlign="right"
          placeholder="الاسم الكامل"
          placeholderTextColor={colors.textMuted}
        />
        <PrimaryButton label="حفظ" onPress={handleSave} loading={saving} style={{ marginTop: spacing.lg }} />
      </BottomSheet>

      <BottomSheet visible={changingPassword} onClose={() => setChangingPassword(false)}>
        <Text style={styles.sheetTitle}>تغيير كلمة المرور</Text>
        <View style={{ gap: spacing.md }}>
          <FormField
            label="كلمة المرور الجديدة"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="••••••••"
            secure
            autoCapitalize="none"
            hint="ستة أحرف على الأقل"
          />
          <FormField
            label="تأكيد كلمة المرور"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
            secure
            autoCapitalize="none"
            error={confirmPassword && confirmPassword !== newPassword ? "غير متطابقتين" : ""}
          />
        </View>
        <PrimaryButton
          label="حفظ كلمة المرور"
          onPress={handleChangePassword}
          loading={savingPassword}
          style={{ marginTop: spacing.lg }}
        />
      </BottomSheet>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { ...typography.h1, marginBottom: spacing.lg },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: { flex: 1, gap: 2 },
  name: { ...typography.h3 },
  email: { ...typography.caption, fontSize: 11.5, color: colors.textMuted },
  phone: { ...typography.bodyMuted },
  list: { gap: spacing.sm, marginBottom: spacing.xl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  rowPressed: { opacity: 0.85 },
  rowLabel: { ...typography.body, flex: 1 },
  rowValue: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#8a6d2c" },
  signOut: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  signOutLabel: { fontFamily: "Tajawal_500Medium", fontSize: 14, color: colors.danger },
  // ضغطة مطوّلة على اسم التطبيق تفتح بوابة الإدارة — غير ظاهرة للمستخدم العادي
  adminHint: { alignItems: "center", paddingVertical: spacing.sm },
  adminHintText: { ...typography.caption, fontSize: 11 },
  sheetTitle: { ...typography.h2, marginBottom: spacing.lg, textAlign: "center" },
  sheetInput: {
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 52,
    paddingHorizontal: spacing.lg,
  },
});
