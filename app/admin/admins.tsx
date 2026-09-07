import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "@/components/BottomSheet";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SecondaryButton } from "@/components/SecondaryButton";
import { colors, radius, spacing, typography } from "@/constants";
import { maskPhone, useAdminSettingsStore, type AdminAccount } from "@/store/adminSettingsStore";
import { showToast } from "@/store/toastStore";

const PHONE_REGEX = /^(?:\+968)?9\d{7}$/;

/** الحسابات التي تملك صلاحية فتح اللوحة. */
export default function AdminAccountsScreen() {
  const admins = useAdminSettingsStore((state) => state.admins);
  const addAdmin = useAdminSettingsStore((state) => state.addAdmin);
  const removeAdmin = useAdminSettingsStore((state) => state.removeAdmin);
  const logAction = useAdminSettingsStore((state) => state.logAction);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pendingRemove, setPendingRemove] = useState<AdminAccount | null>(null);

  const canAdd = name.trim().length > 2 && PHONE_REGEX.test(phone.trim());

  const handleAdd = () => {
    if (!canAdd) {
      showToast("أدخل الاسم ورقم هاتف عماني صحيح", "error");
      return;
    }
    if (admins.some((admin) => admin.phone === phone.trim())) {
      showToast("هذا الرقم مُدرج بالفعل", "error");
      return;
    }
    addAdmin(name, phone);
    logAction(`إضافة حساب إداري: ${name.trim()}`);
    setName("");
    setPhone("");
    showToast("تمت إضافة الحساب الإداري", "success");
  };

  const confirmRemove = () => {
    if (!pendingRemove) return;
    if (admins.length === 1) {
      showToast("لا يمكن إزالة آخر حساب إداري", "error");
      setPendingRemove(null);
      return;
    }
    removeAdmin(pendingRemove.id);
    logAction(`إزالة حساب إداري: ${pendingRemove.name}`);
    setPendingRemove(null);
    showToast("تمت إزالة الحساب", "success");
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="الحسابات الإدارية" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.listCard}>
          {admins.map((admin, index) => (
            <View key={admin.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.rowTitle}>{admin.name}</Text>
                  <Text style={styles.rowMeta}>{maskPhone(admin.phone)}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`إزالة ${admin.name}`}
                  onPress={() => setPendingRemove(admin)}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>إضافة حساب إداري</Text>
        <View style={styles.field}>
          <Text style={styles.label}>الاسم</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="اسم المسؤول"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            textAlign="right"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>رقم الهاتف</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={12}
            placeholder="9XXXXXXX"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            textAlign="right"
          />
        </View>
        <PrimaryButton label="إضافة" onPress={handleAdd} disabled={!canAdd} style={{ marginTop: spacing.md }} />

        <View style={styles.privacyCard}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
          <Text style={styles.privacyText}>
            تُعرض أرقام الحسابات الإدارية مقنّعة (9•••4567) ولا تُعرض كاملة لأحد. وأرقام هواتف
            المستخدمين العاديين لا تظهر في هذه اللوحة إطلاقًا.
          </Text>
        </View>
      </ScrollView>

      <BottomSheet visible={Boolean(pendingRemove)} onClose={() => setPendingRemove(null)}>
        <Text style={styles.sheetTitle}>إزالة الصلاحية</Text>
        <Text style={styles.sheetBody}>
          لن يتمكن «{pendingRemove?.name}» من فتح لوحة الإدارة بعد ذلك. يبقى حسابه في التطبيق كمستخدم
          عادي.
        </Text>
        <PrimaryButton
          label="إزالة الصلاحية"
          onPress={confirmRemove}
          style={{ marginTop: spacing.lg, backgroundColor: colors.danger }}
        />
        <SecondaryButton
          label="تراجع"
          onPress={() => setPendingRemove(null)}
          style={{ marginTop: spacing.sm }}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl },
  listCard: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { ...typography.body, fontFamily: "Tajawal_500Medium" },
  rowMeta: { ...typography.caption, fontSize: 12 },
  divider: { height: 1, backgroundColor: colors.border },
  sectionLabel: { ...typography.h3, marginTop: spacing.xl, marginBottom: spacing.xs },
  field: { marginBottom: spacing.sm },
  label: { ...typography.caption, marginBottom: spacing.xs, marginTop: spacing.sm },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 50,
  },
  privacyCard: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  privacyText: { ...typography.caption, flex: 1, lineHeight: 20 },
  sheetTitle: { ...typography.h2, textAlign: "center" },
  sheetBody: { ...typography.bodyMuted, textAlign: "center", marginTop: spacing.sm, lineHeight: 22 },
});
