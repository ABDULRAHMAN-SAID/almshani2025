import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ActivityCard } from "@/components/ActivityCard";
import { AnnouncementCard } from "@/components/AnnouncementCard";
import { AwarenessCard } from "@/components/AwarenessCard";
import { CategoryCard } from "@/components/CategoryCard";
import { EmptyState } from "@/components/EmptyState";
import { EventHero } from "@/components/EventHero";
import { ActivitySkeletonCard } from "@/components/LoadingSkeleton";
import { Logo } from "@/components/Logo";
import { SectionHeader } from "@/components/SectionHeader";
import { HOME_SECTIONS } from "@/constants/categories";
import { colors, spacing, typography } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import {
  useHeroActivity,
  useLatestAnnouncements,
  useThisWeekActivities,
  useTodayAwareness,
  useUpcomingActivities,
} from "@/hooks/useHomeData";
import { formatArabicWeekday } from "@/utils/date";
import { showToast } from "@/store/toastStore";

export default function HomeScreen() {
  const { user } = useAuth();
  const hero = useHeroActivity();
  const upcoming = useUpcomingActivities(hero.data?.id);
  const announcements = useLatestAnnouncements();
  const awareness = useTodayAwareness();
  const thisWeek = useThisWeekActivities();

  const notImplementedYet = () => showToast("هذه الشاشة ستُضاف في مرحلة قادمة من التطبيق");

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Logo size="sm" />
        <Text style={styles.brand}>أنشطتي</Text>
      </View>

      <View style={styles.greeting}>
        <Text style={styles.greetingTitle}>مرحبًا، {user?.name ?? ""}</Text>
        <Text style={styles.greetingSubtitle}>اطّلع على أحدث الأنشطة والفعاليات</Text>
      </View>

      {hero.isLoading ? (
        <ActivitySkeletonCard />
      ) : hero.data ? (
        <EventHero
          activity={hero.data}
          onViewDetails={notImplementedYet}
          onRegister={notImplementedYet}
        />
      ) : (
        <EmptyState
          icon="calendar-outline"
          title="لا توجد أنشطة قادمة حاليًا"
          subtitle="سيتم إعلامك عند إضافة نشاط جديد"
        />
      )}

      <View style={styles.section}>
        <SectionHeader title="الأنشطة القادمة" />
        {upcoming.isLoading ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
            {[1, 2].map((k) => (
              <ActivitySkeletonCard key={k} />
            ))}
          </ScrollView>
        ) : upcoming.data && upcoming.data.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
            {upcoming.data.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} onPress={notImplementedYet} />
            ))}
          </ScrollView>
        ) : (
          <EmptyState title="لا توجد أنشطة قادمة حاليًا" subtitle="سيتم إعلامك عند إضافة نشاط جديد" />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="الأقسام" />
        <View style={styles.grid}>
          {HOME_SECTIONS.map((section) => (
            <View key={section.key} style={styles.gridItem}>
              <CategoryCard label={section.label} icon={section.icon} onPress={notImplementedYet} />
            </View>
          ))}
        </View>
      </View>

      {thisWeek.data && thisWeek.data.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="هذا الأسبوع" />
          <View style={styles.weekCard}>
            {thisWeek.data.map((activity) => (
              <View key={activity.id} style={styles.weekRow}>
                <Text style={styles.weekDay}>{formatArabicWeekday(activity.date)}</Text>
                <Text style={styles.weekTitle} numberOfLines={1}>
                  {activity.title}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {announcements.data && announcements.data.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="آخر الإعلانات" actionLabel="عرض الكل" onPressAction={notImplementedYet} />
          <View style={{ gap: spacing.sm }}>
            {announcements.data.map((announcement) => (
              <AnnouncementCard key={announcement.id} announcement={announcement} onPress={notImplementedYet} />
            ))}
          </View>
        </View>
      ) : null}

      {awareness.data ? (
        <View style={styles.section}>
          <AwarenessCard article={awareness.data} onPress={notImplementedYet} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: 0 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg },
  brand: { ...typography.h2 },
  greeting: { marginBottom: spacing.lg, gap: 2 },
  greetingTitle: { ...typography.h1 },
  greetingSubtitle: { ...typography.bodyMuted },
  section: { marginTop: spacing.xl },
  hList: { gap: spacing.md, paddingEnd: spacing.lg },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  gridItem: { width: "47%" },
  weekCard: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.lg, gap: spacing.md },
  weekRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  weekDay: { ...typography.caption, width: 64 },
  weekTitle: { ...typography.body, flex: 1, fontFamily: "Tajawal_500Medium" },
});
