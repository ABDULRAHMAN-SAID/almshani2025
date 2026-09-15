import type {
  ClubMenu,
  ClubProfile,
  Activity,
  ActivityResult,
  Announcement,
  AnnouncementType,
  AppNotification,
  AwarenessArticle,
  MediaAttachment,
  NewsItem,
  NewsScope,
  PointsReason,
  PointsTransaction,
  QuizQuestion,
  RegistrationState,
} from "@/types/models";

/**
 * تحويل صفوف قاعدة البيانات إلى نماذج التطبيق.
 *
 * القاعدة تسمّي أعمدتها `start_time` و`published_at`، والنماذج تسمّيها
 * `startTime` و`publishedAt`. وكان بعض الخدمات يمرّر الصفّ كما هو بتحويل نوع
 * (`data as Activity[]`) — والتحويل في TypeScript وعدٌ للمترجم لا فحصٌ وقت
 * التشغيل، فيمرّ صامتًا ثم تظهر كل هذه الحقول `undefined` على الجهاز: نشاط بلا
 * وقت ولا صورة ولا حالة تسجيل.
 *
 * ولا يظهر هذا في الوضع التجريبي إطلاقًا، لأن بياناته مكتوبة بأسماء النماذج
 * أصلًا ولا تمرّ على قاعدة. فلا يُكتشف إلا على هاتف مستخدم بعد التوزيع.
 *
 * لذلك: لا يُقرأ صفّ من الخادم إلا من هنا.
 */

type Row = Record<string, unknown>;

const text = (value: unknown, fallback = ""): string =>
  value === null || value === undefined ? fallback : String(value);

/** تواريخ القاعدة timestamptz؛ الواجهة تعرض اليوم فقط. */
const day = (value: unknown): string => text(value).slice(0, 10);

const optional = (value: unknown): string | undefined =>
  value === null || value === undefined || value === "" ? undefined : String(value);

const optionalNumber = (value: unknown): number | undefined =>
  value === null || value === undefined ? undefined : Number(value);

export const toActivityResult = (row: Row): ActivityResult => ({
  rank: Number(row.rank) as ActivityResult["rank"],
  winnerName: text(row.winner_name),
  note: optional(row.note),
});

export const toActivity = (row: Row): Activity => ({
  id: text(row.id),
  title: text(row.title),
  description: text(row.description),
  category: row.category as Activity["category"],
  coverImage: optional(row.cover_image),
  date: day(row.date),
  // القاعدة ترجع time بصيغة HH:MM:SS، والواجهة تعرض HH:MM.
  startTime: text(row.start_time).slice(0, 5),
  endTime: row.end_time ? text(row.end_time).slice(0, 5) : undefined,
  location: text(row.location),
  capacity: optionalNumber(row.capacity),
  registrationStatus: (row.registration_status as RegistrationState) ?? "upcoming",
  registrationDeadline: optional(row.registration_deadline),
  isAnnual: Boolean(row.is_annual),
  // results و checkInCode لا يأتيان مع صفّ النشاط: الأولى جدول مستقل،
  // والثاني لا يُقرأ إلا بدالة موثوقة على الخادم.
  createdAt: day(row.created_at),
});

export const toClubProfile = (row: Row): ClubProfile => ({
  key: row.key as ClubProfile["key"],
  title: text(row.title),
  subtitle: text(row.subtitle),
  image: optional(row.image),
});

export const toClubMenu = (row: Row): ClubMenu => ({
  id: text(row.id),
  club: row.club as ClubMenu["club"],
  weekStart: day(row.week_start),
  image: optional(row.image),
  days: (row.days as ClubMenu["days"]) ?? [],
  note: text(row.note),
  publishedAt: day(row.published_at),
});

export const toAnnouncement = (row: Row): Announcement => ({
  id: text(row.id),
  title: text(row.title),
  description: text(row.description),
  type: (row.type as AnnouncementType) ?? "عام",
  image: optional(row.image),
  club: (optional(row.club) as Announcement["club"]) ?? undefined,
  attachments: (row.attachments as MediaAttachment[]) ?? [],
  publishedAt: day(row.published_at),
});

export const toAwarenessArticle = (row: Row): AwarenessArticle => ({
  id: text(row.id),
  title: text(row.title),
  summary: text(row.summary),
  content: text(row.content),
  category: text(row.category),
  image: optional(row.image),
  publishedAt: day(row.published_at),
});

export const toNotification = (row: Row): AppNotification => ({
  id: text(row.id),
  userId: text(row.user_id),
  title: text(row.title),
  body: text(row.body),
  read: Boolean(row.read),
  createdAt: day(row.created_at),
});

/**
 * سجلّ النقاط. القاعدة تحفظ `activity_id` لا عنوان النشاط، فيأتي العنوان من
 * العلاقة المضمّنة `activities(title)` إن طُلبت في الاستعلام.
 */
export const toPointsTransaction = (row: Row): PointsTransaction => {
  const activity = row.activities as { title?: unknown } | null | undefined;
  return {
    id: text(row.id),
    userId: text(row.user_id),
    reason: row.reason as PointsReason,
    points: Number(row.points ?? 0),
    activityTitle: optional(activity?.title),
    createdAt: day(row.created_at),
  };
};

export const toQuizQuestion = (row: Row): QuizQuestion => ({
  id: text(row.id),
  quizId: text(row.quiz_id),
  text: text(row.text),
  options: (row.options as string[]) ?? [],
  category: text(row.category),
  // العرض العام لا يرسل الإجابة الصحيحة — تبقى -1 حتى تصل من مسار موثوق.
  correctOptionIndex: row.correct_option_index === undefined ? -1 : Number(row.correct_option_index),
});

/** صفّ خبر من القاعدة إلى نموذج الشاشة. */
export const toNewsItem = (row: Row): NewsItem => ({
  id: text(row.id),
  title: text(row.title),
  summary: text(row.summary),
  body: text(row.body),
  // النطاق محصور في القاعدة بقيد، فقيمة غريبة تعني صفًّا أُدخل من خارج
  // التطبيق؛ نعدّه عالميًّا بدل أن نُسقط الخبر كلّه.
  scope: (row.scope === "oman" ? "oman" : "world") as NewsScope,
  source: text(row.source),
  url: optional(row.url),
  image: optional(row.image),
  publishedAt: text(row.published_at),
});
