import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ActivityCard } from "@/components/ActivityCard";
import { AnnouncementCard } from "@/components/AnnouncementCard";
import { AwarenessCard } from "@/components/AwarenessCard";
import { CategoryCard } from "@/components/CategoryCard";
import { EmptyState } from "@/components/EmptyState";
import { EventHero } from "@/components/EventHero";
import { HeaderBand } from "@/components/HeaderBand";
import { ActivitySkeletonCard } from "@/components/LoadingSkeleton";
import { Logo } from "@/components/Logo";
import { PointsBadge } from "@/components/PointsBadge";
import { SectionHeader } from "@/components/SectionHeader";
import { WeeklyQuizTeaserCard } from "@/components/WeeklyQuizTeaserCard";
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
import { usePointsBalance } from "@/hooks/usePoints";
import { useWeeklyQuiz } from "@/hooks/useWeeklyQuiz";
import { getAnsweredState } from "@/services/quizService";
import { formatArabicWeekday } from "@/utils/date";
import { showToast } from "@/store/toastStore";

/** الأقسام التي لها شاشة فعلية الآن — الباقي يعرض رسالة "قريبًا". */
const IMPLEMENTED_ROUTES: Record<string, string> = {
  calendar: "/calendar",
  security: "/(tabs)/awareness",
  quiz: "/quiz",
};

export default function HomeScreen() {
  const { user } = useAuth();
  const hero = useHeroActivity();
  const upcoming = useUpcomingActivities(hero.data?.id);
  const announcements = useLatestAnnouncements();
  const awareness = useTodayAwareness();
  const thisWeek = useThisWeekActivities();
  const points = usePointsBalance();
  const weeklyQuiz = useWeeklyQuiz();

  const notImplementedYet = () => showToast("هذه الشاشة ستُضاف في مرحلة قادمة من التطبيق");
  const answeredCount = weeklyQuiz.data?.questions.filter((question) => getAnsweredState(question.id)).length ?? 0;

  const openSection = (key: string) => {
    const route = IMPLEMENTED_ROUTES[key];
    if (route) router.push(route as never);
    else notImplementedYet();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <HeaderBand overlap={44}>
        <View style={styles.header}>
          <Logo size="sm" />
          <Text style={styles.brand}>أنشطتي</Text>
          <View style={styles.spacer} />
          <PointsBadge points={points.data ?? 0} onPress={() => router.push("/points-history")} />
        </View>

        <View style={styles.greeting}>
          <Text style={styles.greetingTitle}>مرحبًا، {user?.name ?? ""}</Text>
          <Text style={styles.greetingSubtitle}>اطّلع على أحدث الأنشطة والفعاليات</Text>
        </View>
      </HeaderBand>

      <View style={styles.grid}>
        {HOME_SECTIONS.map((section) => (
          <View key={section.key} style={styles.gridItem}>
            <CategoryCard
              label={section.label}
              icon={section.icon}
              tint={section.tint}
              onPress={() => openSection(section.key)}
            />
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <SectionHeader title="النشاط القادم" />
        {hero.isLoading ? (
          <ActivitySkeletonCard />
        ) : hero.data ? (
          <EventHero activity={hero.data} onViewDetails={notImplementedYet} onRegister={notImplementedYet} />
        ) : (
          <EmptyState
            icon="calendar-outline"
            title="لا توجد أنشطة قادمة حاليًا"
            subtitle="سيتم إعلامك عند إضافة نشاط جديد"
          />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="الأنشطة القادمة" actionLabel="التقويم" onPressAction={() => router.push("/calendar")} />
        {upcoming.isLoading ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.hScroll}
            contentContainerStyle={styles.hList}
          >
            {[1, 2].map((key) => (
              <ActivitySkeletonCard key={key} />
            ))}
          </ScrollView>
        ) : upcoming.data && upcoming.data.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.hScroll}
            contentContainerStyle={styles.hList}
          >
            {upcoming.data.slice(0, 8).map((activity) => (
              <ActivityCard key={activity.id} activity={activity} onPress={notImplementedYet} />
            ))}
          </ScrollView>
        ) : (
          <EmptyState title="لا توجد أنشطة قادمة حاليًا" subtitle="سيتم إعلامك عند إضافة نشاط جديد" />
        )}
      </View>

      {weeklyQuiz.data ? (
        <View style={styles.section}>
          <WeeklyQuizTeaserCard
            quiz={weeklyQuiz.data}
            answeredCount={answeredCount}
            onPress={() => router.push("/quiz")}
          />
        </View>
      ) : null}

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
          <AwarenessCard article={awareness.data} onPress={() => router.push("/(tabs)/awareness")} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  spacer: { flex: 1 },
  brand: { ...typography.h2, color: colors.textOnPrimary },
  greeting: { gap: 2 },
  greetingTitle: { ...typography.h1, color: colors.textOnPrimary },
  greetingSubtitle: { ...typography.bodyMuted, color: "rgba(255,255,255,0.72)" },
  // شبكة الأقسام تتداخل مع أسفل الشريط الكحلي فتعطي إحساسًا بالعمق
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: -44,
    paddingHorizontal: spacing.lg,
  },
  gridItem: { width: "31%" },
  section: { marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  // القائمة الأفقية تمتد إلى حافة الشاشة بدل أن تتوقف عند هامش القسم
  hScroll: { marginHorizontal: -spacing.lg },
  hList: { gap: spacing.md, paddingHorizontal: spacing.lg },
  weekCard: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.lg, gap: spacing.md },
  weekRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  weekDay: { ...typography.caption, width: 64 },
  weekTitle: { ...typography.body, flex: 1, fontFamily: "Tajawal_500Medium" },
});
