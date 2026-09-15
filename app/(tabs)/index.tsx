import { useEffect, useState } from "react";
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
import { NewsCard } from "@/components/NewsCard";
import { SectionHeader } from "@/components/SectionHeader";
import { WeeklyQuizTeaserCard } from "@/components/WeeklyQuizTeaserCard";
import { HOME_SECTIONS } from "@/constants/categories";
import { colors, radius, shadow, spacing, typography } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import {
  useHeroActivity,
  useLatestAnnouncements,
  useThisWeekActivities,
  useTodayAwareness,
  useUpcomingActivities,
  useLatestNews,
} from "@/hooks/useHomeData";
import { usePointsBalance } from "@/hooks/usePoints";
import { useWeeklyQuiz } from "@/hooks/useWeeklyQuiz";
import { getAnsweredState } from "@/services/quizService";
import { formatArabicWeekday, omanDateTimeLabel } from "@/utils/date";
import { useFeatures } from "@/hooks/useFeatures";

export default function HomeScreen() {
  const { user } = useAuth();
  const hero = useHeroActivity();
  const upcoming = useUpcomingActivities(hero.data?.id);
  const announcements = useLatestAnnouncements();
  const news = useLatestNews();
  const awareness = useTodayAwareness();
  const thisWeek = useThisWeekActivities();
  const points = usePointsBalance();
  const weeklyQuiz = useWeeklyQuiz();
  const { discussionEnabled, messagesEnabled, quizEnabled } = useFeatures();

  // ساعة القاعدة، تُحدَّث كل دقيقة.
  //
  // ولا تُقرأ من ساعة الجهاز: من ضبط هاتفه على منطقة أخرى — أو سافر — تظل
  // الشاشة تقول توقيت عُمان، وهو التوقيت الذي تُعقد به المحاضرات ويُفتح به
  // التسجيل. وساعةٌ تقول غيره أسوأ من لا ساعة.
  const [clock, setClock] = useState(() => omanDateTimeLabel());
  useEffect(() => {
    const id = setInterval(() => setClock(omanDateTimeLabel()), 30_000);
    return () => clearInterval(id);
  }, []);

  const answeredCount = weeklyQuiz.data?.questions.filter((question) => getAnsweredState(question.id)).length ?? 0;

  // الوجهة تُقرأ من HOME_SECTIONS نفسها، لا من جدولٍ ثانٍ بجانبها.
  //
  // كان هنا جدول وجهات منفصل، فلمّا أُضيف قسم «الأخبار» إلى الشبكة ولم يُضف
  // إلى الجدول صارت أيقونته تُرسم ولا تفتح شيئًا حين تُلمس — لا خطأ ولا
  // شاشة، سكوت. ومصدرٌ واحد للوجهة يمنع أن يتكرّر هذا مع أي قسم يُضاف بعد.
  const openSection = (route: string) => router.push(route as never);

  // الأقسام التي تستطيع الإدارة إيقافها تختفي من الشبكة كليًا حين تُوقَف.
  const sections = HOME_SECTIONS.filter((section) => {
    if (section.key === "groups") return discussionEnabled;
    if (section.key === "messages") return messagesEnabled;
    if (section.key === "quiz") return quizEnabled;
    return true;
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <HeaderBand overlap={44}>
        <Text style={styles.clock}>{clock}</Text>

        <View style={styles.header}>
          <Logo size="sm" />
          <Text style={styles.brand}>أنشطتي</Text>
          <View style={styles.spacer} />
          <PointsBadge points={points.data ?? 0} onPress={() => router.push("/points-history")} />
        </View>

        <View style={styles.greeting}>
          <Text style={styles.greetingTitle}>{user?.name ? `مرحبًا، ${user.name}` : "مرحبًا"}</Text>
          <Text style={styles.greetingSubtitle}>اطّلع على أحدث الأنشطة والفعاليات</Text>
        </View>
      </HeaderBand>

      <View style={styles.gridPanel}>
        <View style={styles.grid}>
          {sections.map((section) => (
            <View key={section.key} style={styles.gridItem}>
              <CategoryCard
                label={section.label}
                icon={section.icon}
                tint={section.tint}
                variant="plain"
                onPress={() => openSection(section.route)}
              />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="النشاط القادم" />
        {hero.isLoading ? (
          <ActivitySkeletonCard />
        ) : hero.data ? (
          <EventHero
            activity={hero.data}
            onViewDetails={() => router.push(`/activity/${hero.data!.id}`)}
            onRegister={() => router.push(`/activity/${hero.data!.id}`)}
          />
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
              <ActivityCard
                key={activity.id}
                activity={activity}
                onPress={() => router.push(`/activity/${activity.id}`)}
              />
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

      {/*
        قسم الأخبار يظهر دائمًا، ولو لم يُنشر خبر بعد.
        كان يختفي حين تخلو القاعدة من خبر، فبدا لمن يبحث عنه أنه غير موجود
        في التطبيق أصلًا — وهو موجود وينتظر أول خبر. وسطرٌ يقول ذلك أصدق من
        فراغ يُفسَّر عطلًا.
      */}
      <View style={styles.section}>
        <SectionHeader
          title="أهم الأخبار"
          actionLabel="عرض الكل"
          onPressAction={() => router.push("/news")}
        />
        {news.data && news.data.length > 0 ? (
          // صفّ يُسحب جانبًا كبقيّة أقسام الصفحة، لا عمود.
          // عمودًا كان الخبران الأولان يملآن الشاشة، فلا يصل أحدٌ إلى ما
          // تحتهما إلا بسحبٍ طويل — والصفحة الرئيسية نظرةٌ لا قراءة.
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.hScroll}
            contentContainerStyle={styles.hList}
          >
            {news.data.map((item) => (
              <NewsCard key={item.id} item={item} compact />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.newsPlaceholder}>
            <Text style={styles.newsPlaceholderText}>
              {news.isLoading
                ? "جارٍ تحميل الأخبار…"
                : news.error
                  ? "تعذّر تحميل الأخبار — تحقّق من الاتصال ثم أعد فتح الصفحة."
                  : "لا أخبار منشورة بعد. تنشرها الإدارة من: الإدارة ← المحتوى ← الأخبار."}
            </Text>
          </View>
        )}
      </View>

      {announcements.data && announcements.data.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            title="آخر الإعلانات"
            actionLabel="عرض الكل"
            onPressAction={() => router.push("/announcements")}
          />
          <View style={{ gap: spacing.sm }}>
            {announcements.data.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                onPress={() => router.push("/announcements")}
              />
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
  // لوح واحد يضمّ الأقسام، ويتداخل مع أسفل الشريط الكحلي فيعطي إحساسًا بالعمق
  gridPanel: {
    marginTop: -44,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg + 4,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    ...shadow.card,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  gridItem: { width: "33.33%" },
  // ‏textAlign "left" اتجاهٌ مطلق لا نسبيّ، فيبقى يسارًا في واجهة تُقرأ يمينًا.
  clock: {
    ...typography.caption,
    fontSize: 11,
    color: "rgba(255,255,255,0.72)",
    textAlign: "left",
    marginBottom: -spacing.sm,
  },
  section: { marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  newsPlaceholder: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  newsPlaceholderText: { ...typography.caption, color: colors.textMuted, textAlign: "center" },
  // القائمة الأفقية تمتد إلى حافة الشاشة بدل أن تتوقف عند هامش القسم
  hScroll: { marginHorizontal: -spacing.lg },
  hList: { gap: spacing.md, paddingHorizontal: spacing.lg },
  weekCard: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.lg, gap: spacing.md },
  weekRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  weekDay: { ...typography.caption, width: 64 },
  weekTitle: { ...typography.body, flex: 1, fontFamily: "Tajawal_500Medium" },
});
