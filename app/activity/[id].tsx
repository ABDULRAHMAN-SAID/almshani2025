import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { BottomSheet } from "@/components/BottomSheet";
import { EmptyState } from "@/components/EmptyState";
import { PatternOverlay } from "@/components/PatternOverlay";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { CATEGORY_META, tintBackground } from "@/constants/categories";
import { colors, radius, spacing, typography } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { fetchActivityById } from "@/services/activityService";
import { canRegister, cancelRegistration, registerForActivity } from "@/services/registrationService";
import { useRegistrationStore } from "@/store/registrationStore";
import { showToast } from "@/store/toastStore";
import { formatArabicDate, formatArabicTime, formatArabicWeekday, relativeDayLabel } from "@/utils/date";
import { REGISTRATION_COLOR, REGISTRATION_LABEL } from "@/utils/registration";

/** شاشة تفاصيل موحّدة لكل أنواع الأنشطة (مسابقة، محاضرة، رياضة، رماية...). */
export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: activity, isLoading } = useQuery({
    queryKey: ["activity", id],
    queryFn: () => fetchActivityById(id),
  });

  const registeredIds = useRegistrationStore((state) => state.registeredIds);
  const isRegistered = activity ? registeredIds.includes(activity.id) : false;
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (isLoading) return <View style={styles.screen} />;
  if (!activity) {
    return (
      <View style={styles.screen}>
        <TopBar onDark={false} />
        <EmptyState icon="alert-circle-outline" title="لم يتم العثور على هذا النشاط" />
      </View>
    );
  }

  const meta = CATEGORY_META[activity.category];
  const statusColor = REGISTRATION_COLOR[activity.registrationStatus];
  const check = canRegister(activity);
  const seatsLeft =
    activity.capacity != null ? Math.max(activity.capacity - (activity.registeredCount ?? 0), 0) : null;

  const handleConfirm = async () => {
    if (!user) {
      setConfirming(false);
      showToast("سجّل الدخول أولًا للتسجيل في الأنشطة", "error");
      return;
    }
    setBusy(true);
    try {
      const outcome = await registerForActivity(user.id, activity);
      setConfirming(false);
      if (outcome === "registered") showToast("تم تسجيلك بنجاح", "success");
      else if (outcome === "already") showToast("أنت مسجّل في هذا النشاط بالفعل");
      else if (outcome === "full") showToast("اكتمل العدد في هذا النشاط", "error");
      else showToast("التسجيل مغلق لهذا النشاط", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!user) {
      showToast("سجّل الدخول أولًا", "error");
      return;
    }
    setBusy(true);
    try {
      await cancelRegistration(user.id, activity.id);
      showToast("تم إلغاء تسجيلك");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[colors.primaryLight, colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cover}
      >
        <PatternOverlay opacity={0.08} />
        <TopBar onDark />
        <View style={styles.coverBody}>
          <View style={styles.coverIcon}>
            <Ionicons name={meta.icon} size={30} color={colors.gold} />
          </View>
          <Text style={styles.coverCategory}>{meta.label}</Text>
          <Text style={styles.coverTitle}>{activity.title}</Text>
          <View style={styles.coverBadge}>
            <Text style={styles.coverBadgeText}>{relativeDayLabel(activity.date)}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <InfoRow
            icon="calendar-outline"
            label="التاريخ"
            value={`${formatArabicWeekday(activity.date)} · ${formatArabicDate(activity.date)}`}
          />
          <InfoRow
            icon="time-outline"
            label="الوقت"
            value={
              activity.endTime
                ? `${formatArabicTime(activity.startTime)} — ${formatArabicTime(activity.endTime)}`
                : formatArabicTime(activity.startTime)
            }
          />
          <InfoRow icon="location-outline" label="المكان" value={activity.location} />
          {seatsLeft != null ? (
            <InfoRow
              icon="people-outline"
              label="المقاعد المتبقية"
              value={seatsLeft > 0 ? String(seatsLeft) : "اكتمل العدد"}
            />
          ) : null}
          {activity.registrationDeadline ? (
            <InfoRow
              icon="hourglass-outline"
              label="آخر موعد للتسجيل"
              value={formatArabicDate(activity.registrationDeadline)}
            />
          ) : null}
        </View>

        <View style={styles.statusRow}>
          <View style={[styles.statusPill, { backgroundColor: tintBackground(statusColor, 0.12) }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {REGISTRATION_LABEL[activity.registrationStatus]}
            </Text>
          </View>
          {isRegistered ? (
            <View style={[styles.statusPill, { backgroundColor: tintBackground(colors.success, 0.12) }]}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={[styles.statusText, { color: colors.success }]}>أنت مسجّل</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>عن النشاط</Text>
        <Text style={styles.description}>{activity.description}</Text>

        {activity.results && activity.results.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>النتائج</Text>
            <View style={styles.infoCard}>
              {activity.results.map((result) => (
                <View key={result.rank} style={styles.resultRow}>
                  <Ionicons name="trophy" size={16} color={colors.gold} />
                  <Text style={styles.resultRank}>المركز {["الأول", "الثاني", "الثالث"][result.rank - 1]}</Text>
                  <Text style={styles.resultName}>{result.winnerName}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.actions}>
          {isRegistered ? (
            <>
              <SecondaryButton label="إلغاء التسجيل" onPress={handleCancel} />
              <Text style={styles.actionHint}>ستجد هذا النشاط في «نشاطاتي»</Text>
            </>
          ) : check.allowed ? (
            <PrimaryButton label="سجل الآن" onPress={() => setConfirming(true)} />
          ) : (
            <View style={styles.closedBox}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
              <Text style={styles.closedText}>
                {check.reason === "full" ? "اكتمل العدد لهذا النشاط" : "التسجيل مغلق حاليًا"}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <BottomSheet visible={confirming} onClose={() => setConfirming(false)}>
        <Text style={styles.sheetTitle}>هل تريد التسجيل في هذا النشاط؟</Text>
        <Text style={styles.sheetBody}>{activity.title}</Text>
        <Text style={styles.sheetMeta}>
          {formatArabicDate(activity.date)} · {formatArabicTime(activity.startTime)} · {activity.location}
        </Text>
        <PrimaryButton
          label="تأكيد التسجيل"
          onPress={handleConfirm}
          loading={busy}
          style={{ marginTop: spacing.lg }}
        />
        <SecondaryButton
          label="إلغاء"
          onPress={() => setConfirming(false)}
          style={{ marginTop: spacing.sm, borderColor: "transparent" }}
        />
      </BottomSheet>
    </View>
  );
}

function TopBar({ onDark }: { onDark: boolean }) {
  const tint = onDark ? colors.textOnPrimary : colors.textPrimary;
  return (
    <View style={styles.topBar}>
      <Pressable accessibilityRole="button" accessibilityLabel="رجوع" onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-forward" size={22} color={tint} />
      </Pressable>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={17} color={colors.primary} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  cover: {
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.lg + 8,
    borderBottomRightRadius: radius.lg + 8,
    overflow: "hidden",
  },
  topBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  coverBody: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.xs },
  coverIcon: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  coverCategory: { fontFamily: "Tajawal_400Regular", fontSize: 13, color: "rgba(255,255,255,0.8)" },
  coverTitle: { ...typography.h1, color: colors.textOnPrimary, fontSize: 23 },
  coverBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(199,162,82,0.18)",
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
  },
  coverBadgeText: { fontFamily: "Tajawal_500Medium", fontSize: 12, color: colors.gold },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  infoLabel: { ...typography.caption, width: 92 },
  infoValue: { ...typography.body, flex: 1, fontFamily: "Tajawal_500Medium" },
  statusRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  statusText: { fontFamily: "Tajawal_500Medium", fontSize: 12 },
  sectionLabel: { ...typography.h3, marginTop: spacing.xl, marginBottom: spacing.sm },
  description: { ...typography.body, lineHeight: 24 },
  resultRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  resultRank: { ...typography.caption, width: 92 },
  resultName: { ...typography.body, flex: 1, fontFamily: "Tajawal_500Medium" },
  actions: { marginTop: spacing.xl, gap: spacing.sm },
  actionHint: { ...typography.caption, textAlign: "center" },
  closedBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
  },
  closedText: { ...typography.bodyMuted },
  sheetTitle: { ...typography.h2, textAlign: "center", marginBottom: spacing.md, fontSize: 18 },
  sheetBody: { ...typography.body, textAlign: "center", fontFamily: "Tajawal_500Medium" },
  sheetMeta: { ...typography.caption, textAlign: "center", marginTop: 4 },
});
