import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "@/components/BottomSheet";
import { PrimaryButton } from "@/components/PrimaryButton";
import { colors, radius, spacing, typography } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { usePointsBalance } from "@/hooks/usePoints";
import { updateFullName } from "@/services/authService";
import { showToast } from "@/store/toastStore";

export default function ProfileScreen() {
  const { user, updateName, signOut } = useAuth();
  const points = usePointsBalance();
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);

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
    } finally {
      setSaving(false);
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
        </View>
        <Pressable accessibilityRole="button" onPress={openEdit} hitSlop={8}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.list}>
        <Row icon="star-outline" label="نقاطي" value={String(points.data ?? 0)} onPress={() => router.push("/points-history")} />
        <Row icon="podium-outline" label="قائمة المتصدرين" onPress={() => router.push("/leaderboard")} />
        <Row icon="qr-code-outline" label="تسجيل الحضور" onPress={() => router.push("/check-in")} />
        <Row icon="trophy-outline" label="الأنشطة المسجل فيها" />
        <Row icon="ribbon-outline" label="المسابقات التي شاركت فيها" />
        <Row icon="notifications-outline" label="الإشعارات" onPress={() => showToast("مركز الإشعارات قادم قريبًا")} />
        <Row icon="settings-outline" label="الإعدادات" onPress={() => showToast("الإعدادات قادمة قريبًا")} />
      </View>

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
