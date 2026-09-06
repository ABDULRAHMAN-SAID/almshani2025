import type { ActivityCategory } from "@/constants/categories";

/** المستخدم — بدون رتبة أو رقم عسكري أو جهة عمل، بحسب متطلبات الخصوصية. */
export interface User {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
}

export type RegistrationState = "open" | "closed" | "upcoming" | "ended" | "full";

export interface Activity {
  id: string;
  title: string;
  description: string;
  category: ActivityCategory;
  coverImage?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime?: string;
  location: string;
  capacity?: number;
  registeredCount?: number;
  registrationStatus: RegistrationState;
  registrationDeadline?: string;
  isAnnual?: boolean;
  results?: ActivityResult[];
  /** رمز يُعرض في القاعة (QR أو يُدخل يدويًا) لتأكيد الحضور ومنح نقاط. */
  checkInCode?: string;
  createdAt: string;
}

export interface ActivityResult {
  rank: 1 | 2 | 3;
  winnerName: string;
  note?: string;
}

export interface Registration {
  id: string;
  userId: string;
  activityId: string;
  status: "confirmed" | "cancelled";
  registeredAt: string;
}

export type AnnouncementType = "تسجيل" | "تنبيه" | "نتائج" | "عام";

export interface Announcement {
  id: string;
  title: string;
  description: string;
  type: AnnouncementType;
  publishedAt: string;
}

export interface AwarenessArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  image?: string;
  publishedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

/** نظام النقاط — قيمة موحّدة وبسيطة (10 نقاط) لكل الأسباب. */
export type PointsReason = "lecture_attendance" | "activity_participation" | "quiz_correct";

export const POINTS_VALUE: Record<PointsReason, number> = {
  lecture_attendance: 10,
  activity_participation: 10,
  quiz_correct: 10,
};

export const POINTS_REASON_LABEL: Record<PointsReason, string> = {
  lecture_attendance: "حضور محاضرة",
  activity_participation: "المشاركة في نشاط",
  quiz_correct: "إجابة صحيحة في السؤال الثقافي",
};

export interface PointsTransaction {
  id: string;
  userId: string;
  reason: PointsReason;
  points: number;
  activityTitle?: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  totalPoints: number;
  rank: number;
}

/** التحقق من الحضور برمز يُعرض في القاعة (QR أو رمز يُدخل يدويًا). */
export interface CheckIn {
  id: string;
  userId: string;
  activityId: string;
  code: string;
  checkedInAt: string;
}

export type QuizStatus = "open" | "closed";

export interface QuizQuestion {
  id: string;
  quizId: string;
  text: string;
  options: string[];
  category: string;
  /** يُخفى عن العميل حتى تتم الإجابة أو يُغلق الأسبوع. */
  correctOptionIndex: number;
}

export interface WeeklyQuiz {
  id: string;
  weekLabel: string;
  startDate: string;
  endDate: string;
  status: QuizStatus;
  questions: QuizQuestion[];
}

export interface QuizAnswer {
  id: string;
  userId: string;
  questionId: string;
  selectedOptionIndex: number;
  isCorrect: boolean;
  pointsEarned: number;
  answeredAt: string;
}
