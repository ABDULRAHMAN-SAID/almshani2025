import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { PatternOverlay } from "@/components/PatternOverlay";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { tintBackground } from "@/constants/categories";
import { colors, radius, spacing, typography } from "@/constants";
import { useAllActivities } from "@/hooks/useActivities";
import { useNotifications } from "@/hooks/useNotifications";
import { useAdminStore } from "@/store/adminStore";
import { useRegistrationStore } from "@/store/registrationStore";
import { showToast } from "@/store/toastStore";
import { TODAY_ISO } from "@/utils/calendar";

/** لوحة الإدارة — لا يصل إليها المستخدم العادي، وتُفتح برمز في كل جلسة. */
export default function AdminScreen() {
  const isAdmin = useAdminStore((state) => state.isAdmin);
  return isAdmin ? <Dashboard /> : <UnlockGate />;
}

function UnlockGate() {
  const unlock = useAdminStore((state) => state.unlock);
  const [code, setCode] = useState("");

  const handleUnlock = () => {
    if (unlock(code)) {
      showToast("تم فتح لوحة الإدارة", "success");
    } else {
      showToast("الرمز غير صحيح", "error");
      setCode("");
    }
  };

  return (
    <View style={styles.gateScreen}>
      <PatternOverlay opacity={0.06} />
      <ScreenHeader title="لوحة الإدارة" onDark />
      <View style={styles.gateBody}>
        <View style={styles.gateIcon}>
          <Ionicons name="lock-closed-outline" size={28} color={colors.gold} />
        </View>
        <Text style={styles.gateTitle}>هذه الشاشة للإدارة فقط</Text>
        <Text style={styles.gateHint}>أدخل رمز الإدارة للمتابعة</Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          secureTextEntry
          placeholder="••••"
          placeholderTextColor={colors.textMuted}
          style={styles.gateInput}
          textAlign="center"
        />
        <PrimaryButton label="دخول" onPress={handleUnlock} disabled={!code} style={styles.gateButton} />
        <Text style={styles.gateNote}>
          في هذه النسخة التجريبية الرمز هو 1234؛ عند ربط Supabase يُستبدل بتحقق فعلي من صلاحية الحساب.
        </Text>
      </View>
    </View>
  );
}

function Dashboard() {
  const { data: activities } = useAllActivities();
  const { data: notifications } = useNotifications();
  const registeredIds = useRegistrationStore((state) => state.registeredIds);
  const lock = useAdminStore((state) => state.lock);

  const all = activities ?? [];
  const upcoming = all.filter((activity) => activity.date >= TODAY_ISO);
  const openRegistration = all.filter((activity) => activity.registrationStatus === "open");
  const lectures = upcoming.filter((activity) => activity.category === "Lecture");

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="لوحة الإدارة"
        action={
          <Pressable accessibilityRole="button" onPress={lock} hitSlop={8}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsGrid}>
          <StatTile icon="calendar-outline" tint="#2C7A7B" value={String(upcoming.length)} label="أنشطة قادمة" />
          <StatTile icon="checkmark-circle-outline" tint="#2F855A" value={String(openRegistration.length)} label="تسجيل مفتوح" />
          <StatTile icon="mic-outline" tint="#0B2545" value={String(lectures.length)} label="محاضرات قادمة" />
          <StatTile icon="bookmark-outline" tint="#C7A252" value={String(registeredIds.length)} label="تسجيلاتك" />
          <StatTile icon="notifications-outline" tint="#9B2C2C" value={String((notifications ?? []).length)} label="إشعارات مرسلة" />
          <StatTile icon="albums-outline" tint="#434190" value={String(all.length)} label="إجمالي الأنشطة" />
        </View>

        <Text style={styles.sectionLabel}>الإجراءات</Text>
        <View style={{ gap: spacing.sm }}>
          <ActionRow
            icon="add-circle-outline"
            label="إضافة نشاط جديد"
            hint="مسابقة، محاضرة، فعالية رياضية أو رماية"
            onPress={() => router.push("/admin/new-activity")}
          />
          <ActionRow
            icon="megaphone-outline"
            label="نشر إعلان"
            hint="يظهر في الرئيسية وصفحة الإعلانات"
            onPress={() => router.push("/admin/new-announcement")}
          />
          <ActionRow
            icon="send-outline"
            label="إرسال إشعار"
            hint="يصل إلى مركز الإشعارات لدى المستخدمين"
            onPress={() => router.push("/admin/send-notification")}
          />
        </View>

        <Text style={styles.sectionLabel}>الأنشطة القادمة ({upcoming.length})</Text>
        <View style={styles.listCard}>
          {upcoming.slice(0, 8).map((activity, index) => (
            <View key={activity.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/activity/${activity.id}`)}
                style={styles.manageRow}
              >
                <Text style={styles.manageTitle} numberOfLines={1}>
                  {activity.title}
                </Text>
                <Text style={styles.manageMeta}>
                  {activity.registeredCount ?? 0}
                  {activity.capacity ? ` / ${activity.capacity}` : ""} مسجّل
                </Text>
                <Ionicons name="chevron-back" size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </View>

        <Text style={styles.note}>
          في وضع البيانات التجريبية تُحفظ الإضافات في ذاكرة الجلسة فقط. عند ربط Supabase تُكتب مباشرة في
          قاعدة البيانات وتظهر لكل المستخدمين.
        </Text>
      </ScrollView>
    </View>
  );
}

function StatTile({
  icon,
  tint,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.tile}>
      <View style={[styles.tileIcon, { backgroundColor: tintBackground(tint) }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name={icon} size={20} color={colors.primary} />
      <View style={styles.actionText}>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionHint}>{hint}</Text>
      </View>
      <Ionicons name="chevron-back" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  gateScreen: { flex: 1, backgroundColor: colors.primary },
  gateBody: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.sm },
  gateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  gateTitle: { ...typography.h2, color: colors.textOnPrimary },
  gateHint: { fontFamily: "Tajawal_400Regular", fontSize: 13.5, color: "rgba(255,255,255,0.7)" },
  gateInput: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    height: 56,
    fontFamily: "Tajawal_700Bold",
    fontSize: 22,
    letterSpacing: 10,
    marginTop: spacing.lg,
  },
  gateButton: { width: "100%", marginTop: spacing.md, backgroundColor: colors.accent },
  gateNote: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 19,
    marginTop: spacing.lg,
  },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  tile: {
    width: "31%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
    gap: 4,
  },
  tileIcon: { width: 38, height: 38, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  tileValue: { fontFamily: "Tajawal_700Bold", fontSize: 20, color: colors.textPrimary },
  tileLabel: { ...typography.caption, fontSize: 11, textAlign: "center" },
  sectionLabel: { ...typography.h3, marginTop: spacing.xl, marginBottom: spacing.sm },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  actionText: { flex: 1, gap: 2 },
  actionLabel: { ...typography.body, fontFamily: "Tajawal_500Medium" },
  actionHint: { ...typography.caption },
  listCard: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg },
  manageRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  manageTitle: { ...typography.body, flex: 1 },
  manageMeta: { ...typography.caption },
  divider: { height: 1, backgroundColor: colors.border },
  note: { ...typography.caption, lineHeight: 20, marginTop: spacing.xl, textAlign: "center" },
});
