import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BottomSheet } from "@/components/BottomSheet";
import { EmptyState } from "@/components/EmptyState";
import { FilterChips } from "@/components/FilterChips";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SearchBar } from "@/components/SearchBar";
import { SecondaryButton } from "@/components/SecondaryButton";
import { CATEGORY_META, tintBackground } from "@/constants/categories";
import { colors, radius, spacing, typography } from "@/constants";
import { useAllActivities } from "@/hooks/useActivities";
import { useAnnouncements, useNotifications } from "@/hooks/useNotifications";
import { useLeaderboard } from "@/hooks/usePoints";
import { deleteAnnouncement } from "@/services/adminService";
import { fetchAwarenessLibrary } from "@/services/awarenessService";
import { fetchAllMessages } from "@/services/messageService";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { useAdminStore } from "@/store/adminStore";
import { showToast } from "@/store/toastStore";
import { REGISTRATION_COLOR, REGISTRATION_LABEL } from "@/utils/registration";
import { TODAY_ISO } from "@/utils/calendar";
import { ACTIVITY_FORMS, pluralizeAr } from "@/utils/arabic";
import type { Activity } from "@/types/models";
import { toArabicMessage } from "@/utils/errors";

type AdminTab = "overview" | "activities" | "content" | "people" | "settings";

const TABS: { key: AdminTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "overview", label: "نظرة عامة", icon: "speedometer-outline" },
  { key: "activities", label: "الأنشطة", icon: "calendar-outline" },
  { key: "content", label: "المحتوى", icon: "document-text-outline" },
  { key: "people", label: "المشاركون", icon: "people-outline" },
  { key: "settings", label: "الإعدادات", icon: "settings-outline" },
];

const ACTIVITY_FILTERS = [
  { key: "all", label: "الكل" },
  { key: "open", label: "تسجيل مفتوح" },
  { key: "upcoming", label: "قادمة" },
  { key: "ended", label: "منتهية" },
];

/** لوحة تحكم الإدارة — الحاجز في app/admin/_layout.tsx، وهذه الشاشة هي اللوحة نفسها. */
export default function AdminScreen() {
  const [tab, setTab] = useState<AdminTab>("overview");
  const lock = useAdminStore((state) => state.lock);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="لوحة التحكم"
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="قفل لوحة الإدارة"
            onPress={() => {
              lock();
              showToast("تم قفل لوحة الإدارة", "info");
            }}
            hitSlop={8}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          </Pressable>
        }
      />

      <View style={styles.tabBar}>
        {TABS.map((item) => {
          const active = item.key === tab;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setTab(item.key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Ionicons
                name={item.icon}
                size={16}
                color={active ? colors.textOnPrimary : colors.textMuted}
              />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {tab === "overview" ? <OverviewTab /> : null}
      {tab === "activities" ? <ActivitiesTab /> : null}
      {tab === "content" ? <ContentTab /> : null}
      {tab === "people" ? <PeopleTab /> : null}
      {tab === "settings" ? <SettingsTab /> : null}
    </View>
  );
}

/* ============ نظرة عامة ============ */

function OverviewTab() {
  const adminCount = useAdminSettingsStore((state) => state.admins.length);
  const { data: activities } = useAllActivities();
  const { data: notifications } = useNotifications();
  const { data: announcements } = useAnnouncements();
  const { data: messages } = useQuery({ queryKey: ["messages", "all"], queryFn: fetchAllMessages });
  const newMessages = (messages ?? []).filter((message) => message.status === "new").length;

  const all = activities ?? [];
  const upcoming = all.filter((activity) => activity.date >= TODAY_ISO);
  const openRegistration = all.filter((activity) => activity.registrationStatus === "open");
  const lectures = upcoming.filter((activity) => activity.category === "Lecture");
  const seatsTaken = all.reduce((sum, activity) => sum + (activity.registeredCount ?? 0), 0);
  const withCode = all.filter((activity) => Boolean(activity.checkInCode)).length;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.statsGrid}>
        <StatTile icon="calendar-outline" tint="#2C7A7B" value={upcoming.length} label="أنشطة قادمة" />
        <StatTile
          icon="checkmark-circle-outline"
          tint="#2F855A"
          value={openRegistration.length}
          label="تسجيل مفتوح"
        />
        <StatTile icon="mic-outline" tint="#0B2545" value={lectures.length} label="محاضرات قادمة" />
        <StatTile icon="people-outline" tint="#C7A252" value={seatsTaken} label="مقاعد محجوزة" />
        <StatTile icon="qr-code-outline" tint="#434190" value={withCode} label="أنشطة برمز حضور" />
        <StatTile icon="albums-outline" tint="#8A6D2C" value={all.length} label="إجمالي الأنشطة" />
        <StatTile
          icon="megaphone-outline"
          tint="#B7791F"
          value={(announcements ?? []).length}
          label="إعلانات منشورة"
        />
        <StatTile
          icon="notifications-outline"
          tint="#9B2C2C"
          value={(notifications ?? []).length}
          label="إشعارات مرسلة"
        />
        <StatTile icon="shield-checkmark-outline" tint="#276749" value={adminCount} label="حسابات إدارية" />
      </View>

      <Text style={styles.sectionLabel}>إجراءات سريعة</Text>
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
          hint="يصل إلى مركز الإشعارات لدى كل المستخدمين"
          onPress={() => router.push("/admin/send-notification")}
        />
        <ActionRow
          icon="help-circle-outline"
          label="إدارة السؤال الثقافي"
          hint="أسئلة الأسبوع، الإجابة الصحيحة، فتح الأسبوع وإغلاقه"
          onPress={() => router.push("/admin/quiz")}
        />
        <ActionRow
          icon="bulb-outline"
          label="نشر محتوى توعوي"
          hint="مقال توعوي عام يظهر في تبويب التوعية"
          onPress={() => router.push("/admin/awareness")}
        />
        <ActionRow
          icon="mail-unread-outline"
          label={newMessages > 0 ? `الرسائل الواردة (${newMessages} جديدة)` : "الرسائل الواردة"}
          hint="اقتراحات وطلبات المستخدمين والرد عليها"
          onPress={() => router.push("/admin/inbox")}
        />
        <ActionRow
          icon="chatbubbles-outline"
          label="المجموعات النقاشية"
          hint="إنشاء مجموعة، قفل النقاش، وحذف المشاركات"
          onPress={() => router.push("/admin/groups")}
        />
      </View>

      <Text style={styles.sectionLabel}>أقرب الأنشطة</Text>
      <View style={styles.listCard}>
        {upcoming.slice(0, 5).map((activity, index) => (
          <View key={activity.id}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <ActivityRow activity={activity} />
          </View>
        ))}
        {upcoming.length === 0 ? (
          <EmptyState icon="calendar-outline" title="لا توجد أنشطة قادمة" />
        ) : null}
      </View>

      <Text style={styles.note}>
        في وضع البيانات التجريبية تُحفظ كل التعديلات في ذاكرة الجلسة فقط. عند ربط Supabase تُكتب مباشرة
        في قاعدة البيانات وتظهر لكل المستخدمين، ولا تُقبل أي عملية إدارية إلا من حساب مُدرج في جدول
        الإداريين.
      </Text>
    </ScrollView>
  );
}

/* ============ الأنشطة ============ */

function ActivitiesTab() {
  const { data: activities } = useAllActivities();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const list = useMemo(() => {
    const all = activities ?? [];
    const text = query.trim();
    return all
      .filter((activity) => {
        if (filter === "open") return activity.registrationStatus === "open";
        if (filter === "upcoming") return activity.date >= TODAY_ISO;
        if (filter === "ended") return activity.date < TODAY_ISO;
        return true;
      })
      .filter((activity) => (text ? activity.title.includes(text) || activity.location.includes(text) : true))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [activities, filter, query]);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <SearchBar value={query} onChangeText={setQuery} placeholder="ابحث باسم النشاط أو المكان..." />
      <View style={styles.chipsRow}>
        <FilterChips items={ACTIVITY_FILTERS} activeKey={filter} onChange={setFilter} />
      </View>

      <Text style={styles.resultCount}>{pluralizeAr(list.length, ACTIVITY_FORMS)}</Text>

      {list.length === 0 ? (
        <EmptyState icon="search-outline" title="لا نتائج" subtitle="جرّب كلمة أخرى أو غيّر الفلتر" />
      ) : (
        <View style={styles.listCard}>
          {list.map((activity, index) => (
            <View key={activity.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <ActivityRow activity={activity} />
            </View>
          ))}
        </View>
      )}

      <PrimaryButton
        label="إضافة نشاط جديد"
        onPress={() => router.push("/admin/new-activity")}
        style={{ marginTop: spacing.lg }}
      />
    </ScrollView>
  );
}

function ActivityRow({ activity }: { activity: Activity }) {
  const meta = CATEGORY_META[activity.category];
  const statusColor = REGISTRATION_COLOR[activity.registrationStatus];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/admin/activity/${activity.id}`)}
      style={({ pressed }) => [styles.manageRow, pressed && { opacity: 0.8 }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: tintBackground(meta.tint) }]}>
        <Ionicons name={meta.icon} size={17} color={meta.tint} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.manageTitle} numberOfLines={1}>
          {activity.title}
        </Text>
        <Text style={styles.manageMeta}>
          {activity.date} · {activity.registeredCount ?? 0}
          {activity.capacity ? ` / ${activity.capacity}` : ""} مسجّل
        </Text>
      </View>
      <View style={[styles.pill, { backgroundColor: tintBackground(statusColor, 0.12) }]}>
        <Text style={[styles.pillText, { color: statusColor }]}>
          {REGISTRATION_LABEL[activity.registrationStatus]}
        </Text>
      </View>
      <Ionicons name="chevron-back" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

/* ============ المحتوى ============ */

function ContentTab() {
  const client = useQueryClient();
  const { data: announcements } = useAnnouncements();
  const { data: articles } = useQuery({
    queryKey: ["awareness-library"],
    queryFn: fetchAwarenessLibrary,
  });
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);
  const logAction = useAdminSettingsStore((state) => state.logAction);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteAnnouncement(pendingDelete.id);
      logAction(`حذف إعلان: ${pendingDelete.title}`);
      client.invalidateQueries();
      showToast("تم حذف الإعلان", "success");
    } catch (error) {
      showToast(toArabicMessage(error, "تعذّر حذف الإعلان"), "error");
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ActionRow
          icon="help-circle-outline"
          label="السؤال الثقافي الأسبوعي"
          hint="عرض أسئلة الأسبوع وإجاباتها، وإضافة سؤال جديد"
          onPress={() => router.push("/admin/quiz")}
        />
        <View style={{ height: spacing.sm }} />
        <ActionRow
          icon="bulb-outline"
          label={`المحتوى التوعوي (${(articles ?? []).length})`}
          hint="نشر مقال توعوي عام أو حذف مقال منشور"
          onPress={() => router.push("/admin/awareness")}
        />

        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>الإعلانات ({(announcements ?? []).length})</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/admin/new-announcement")}
            hitSlop={8}
          >
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
          </Pressable>
        </View>

        {(announcements ?? []).length === 0 ? (
          <EmptyState icon="megaphone-outline" title="لا توجد إعلانات منشورة" />
        ) : (
          <View style={styles.listCard}>
            {(announcements ?? []).map((announcement, index) => (
              <View key={announcement.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.manageRow}>
                  <View style={styles.rowText}>
                    <Text style={styles.manageTitle} numberOfLines={1}>
                      {announcement.title}
                    </Text>
                    <Text style={styles.manageMeta}>
                      {announcement.type} · {announcement.publishedAt}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`حذف ${announcement.title}`}
                    onPress={() => setPendingDelete({ id: announcement.id, title: announcement.title })}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.note}>
          المحتوى التوعوي عام فقط: إرشادات سلوكية بلا أي تفاصيل أمنية تشغيلية أو مواقع أو تفاصيل وحدات.
        </Text>
      </ScrollView>

      <BottomSheet visible={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)}>
        <Text style={styles.sheetTitle}>حذف الإعلان</Text>
        <Text style={styles.sheetBody}>
          سيُحذف «{pendingDelete?.title}» نهائيًا ولن يظهر في الرئيسية ولا في صفحة الإعلانات.
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
    </>
  );
}

/* ============ المشاركون ============ */

function PeopleTab() {
  const { data: leaderboard } = useLeaderboard();
  const rows = leaderboard ?? [];
  const totalPoints = rows.reduce((sum, entry) => sum + entry.totalPoints, 0);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.statsGrid}>
        <StatTile icon="people-outline" tint="#2C5282" value={rows.length} label="مشاركون في النقاط" />
        <StatTile icon="ribbon-outline" tint="#C7A252" value={totalPoints} label="مجموع النقاط" />
        <StatTile
          icon="trophy-outline"
          tint="#2F855A"
          value={rows[0]?.totalPoints ?? 0}
          label="أعلى رصيد"
        />
      </View>

      <Text style={styles.sectionLabel}>قائمة المتصدرين</Text>
      {rows.length === 0 ? (
        <EmptyState icon="trophy-outline" title="لا توجد نقاط بعد" />
      ) : (
        <View style={styles.listCard}>
          {rows.slice(0, 10).map((entry, index) => (
            <View key={entry.userId}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.manageRow}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{entry.rank}</Text>
                </View>
                <Text style={[styles.manageTitle, { flex: 1 }]} numberOfLines={1}>
                  {entry.name}
                </Text>
                <Text style={styles.pointsText}>{entry.totalPoints} نقطة</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.privacyCard}>
        <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
        <Text style={styles.privacyText}>
          لا تعرض هذه اللوحة أرقام هواتف المستخدمين ولا بياناتهم الشخصية، ولا يوجد أي حقل للرتبة أو الرقم
          العسكري أو جهة العمل. المتاح للإدارة هو الاسم ومجموع النقاط وأعداد التسجيل المجمّعة فقط.
        </Text>
      </View>
    </ScrollView>
  );
}

/* ============ الإعدادات ============ */

function SettingsTab() {
  const settings = useAdminSettingsStore();

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.statsGrid}>
        <StatTile
          icon={settings.registrationEnabled ? "checkmark-circle-outline" : "close-circle-outline"}
          tint={settings.registrationEnabled ? "#2F855A" : "#9B2C2C"}
          value={settings.registrationEnabled ? 1 : 0}
          label="التسجيل مفعّل"
        />
        <StatTile
          icon={settings.quizEnabled ? "help-circle-outline" : "close-circle-outline"}
          tint={settings.quizEnabled ? "#2C5282" : "#9B2C2C"}
          value={settings.quizEnabled ? 1 : 0}
          label="السؤال مفعّل"
        />
        <StatTile icon="ribbon-outline" tint="#C7A252" value={settings.pointsPerAction} label="نقاط لكل عملية" />
      </View>

      <Text style={styles.sectionLabel}>الإدارة</Text>
      <View style={{ gap: spacing.sm }}>
        <ActionRow
          icon="options-outline"
          label="إعدادات اللوحة"
          hint="رمز الإدارة، مفاتيح التشغيل، وقيمة النقاط"
          onPress={() => router.push("/admin/settings")}
        />
        <ActionRow
          icon="people-circle-outline"
          label={`الحسابات الإدارية (${settings.admins.length})`}
          hint="من يملك صلاحية فتح لوحة التحكم"
          onPress={() => router.push("/admin/admins")}
        />
        <ActionRow
          icon="notifications-outline"
          label="الإشعارات المرسلة"
          hint="مراجعة وحذف وإعادة إرسال"
          onPress={() => router.push("/admin/notifications")}
        />
        <ActionRow
          icon="call-outline"
          label="بيانات التواصل"
          hint="الأرقام والبريد التي تظهر في شاشة «تواصل معنا»"
          onPress={() => router.push("/admin/contact")}
        />
        <ActionRow
          icon="time-outline"
          label={`سجل العمليات (${settings.log.length})`}
          hint="كل ما تمّ من اللوحة بالترتيب الزمني"
          onPress={() => router.push("/admin/log")}
        />
      </View>

      <Text style={styles.sectionLabel}>آخر العمليات</Text>
      {settings.log.length === 0 ? (
        <EmptyState icon="time-outline" title="لم تُسجَّل عمليات بعد" />
      ) : (
        <View style={styles.listCard}>
          {settings.log.slice(0, 5).map((entry, index) => (
            <View key={entry.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.manageRow}>
                <View style={styles.logDot} />
                <Text style={[styles.manageTitle, { flex: 1 }]} numberOfLines={1}>
                  {entry.action}
                </Text>
                <Text style={styles.manageMeta}>{entry.at.slice(0, 10)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

/* ============ عناصر مشتركة ============ */

function StatTile({
  icon,
  tint,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  value: number;
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
  tabBar: {
    flexDirection: "row",
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: spacing.sm,
    paddingHorizontal: 2,
    borderRadius: radius.pill,
  },
  tabActive: { backgroundColor: colors.primary },
  tabLabel: { fontFamily: "Tajawal_500Medium", fontSize: 10.5, color: colors.textMuted },
  tabLabelActive: { color: colors.textOnPrimary },
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
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
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
  rowIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, gap: 2 },
  manageTitle: { ...typography.body, fontFamily: "Tajawal_500Medium" },
  manageMeta: { ...typography.caption, fontSize: 12 },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  pillText: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  divider: { height: 1, backgroundColor: colors.border },
  chipsRow: { marginTop: spacing.md },
  resultCount: { ...typography.caption, marginTop: spacing.md, marginBottom: spacing.sm },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { fontFamily: "Tajawal_700Bold", fontSize: 12.5, color: colors.textPrimary },
  pointsText: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: colors.gold },
  privacyCard: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  privacyText: { ...typography.caption, flex: 1, lineHeight: 20 },
  logDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  sheetTitle: { ...typography.h2, textAlign: "center" },
  sheetBody: { ...typography.bodyMuted, textAlign: "center", marginTop: spacing.sm, lineHeight: 22 },
  note: { ...typography.caption, lineHeight: 20, marginTop: spacing.xl, textAlign: "center" },
});
