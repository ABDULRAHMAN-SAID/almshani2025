import type {
  Activity,
  ActivityResult,
  Announcement,
  AwarenessArticle,
  QuizQuestion,
  QuizStatus,
  RegistrationState,
  WeeklyQuiz,
} from "@/types/models";
import { USE_MOCK_DATA } from "./config";
import {
  MOCK_ACTIVITIES,
  MOCK_ANNOUNCEMENTS,
  MOCK_AWARENESS_LIBRARY,
  MOCK_WEEKLY_QUIZ,
} from "./mockData";
import { pushMockAnnouncement, pushMockNotification } from "./notificationService";
import { toActivity, toQuizQuestion } from "./rowMappers";
import { supabase } from "./supabase";

type NewActivityInput = Omit<Activity, "id" | "createdAt">;

/** الحقول التي تسمح لوحة الإدارة بتعديلها على نشاط قائم. */
export type ActivityPatch = Partial<
  Pick<
    Activity,
    | "title"
    | "description"
    | "date"
    | "startTime"
    | "endTime"
    | "location"
    | "capacity"
    | "registrationStatus"
    | "isAnnual"
    | "coverImage"
  >
>;

const toRow = (patch: ActivityPatch) => ({
  ...(patch.title !== undefined && { title: patch.title }),
  ...(patch.description !== undefined && { description: patch.description }),
  ...(patch.date !== undefined && { date: patch.date }),
  ...(patch.startTime !== undefined && { start_time: patch.startTime }),
  ...(patch.endTime !== undefined && { end_time: patch.endTime }),
  ...(patch.location !== undefined && { location: patch.location }),
  ...(patch.capacity !== undefined && { capacity: patch.capacity }),
  ...(patch.registrationStatus !== undefined && { registration_status: patch.registrationStatus }),
  ...(patch.isAnnual !== undefined && { is_annual: patch.isAnnual }),
  ...(patch.coverImage !== undefined && { cover_image: patch.coverImage || null }),
});

/* ============ الأنشطة ============ */

/** إضافة نشاط من لوحة الإدارة. */
export async function addMockActivity(input: NewActivityInput): Promise<Activity> {
  const activity: Activity = {
    ...input,
    id: `new-${Date.now()}`,
    createdAt: new Date().toISOString().slice(0, 10),
  };

  if (!USE_MOCK_DATA) {
    const { data, error } = await supabase
      .from("activities")
      .insert({ ...toRow(activity), category: activity.category })
      .select()
      .single();
    if (error) throw error;
    return toActivity(data);
  }

  MOCK_ACTIVITIES.push(activity);
  return activity;
}

/** تعديل نشاط قائم. */
export async function updateActivity(id: string, patch: ActivityPatch): Promise<Activity | null> {
  if (!USE_MOCK_DATA) {
    const { data, error } = await supabase
      .from("activities")
      .update(toRow(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return toActivity(data);
  }

  const activity = MOCK_ACTIVITIES.find((item) => item.id === id);
  if (!activity) return null;
  Object.assign(activity, patch);
  return activity;
}

/** حذف نشاط نهائيًا (مع تسجيلاته في الخادم عبر on delete cascade). */
export async function deleteActivity(id: string): Promise<void> {
  if (!USE_MOCK_DATA) {
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  const index = MOCK_ACTIVITIES.findIndex((item) => item.id === id);
  if (index >= 0) MOCK_ACTIVITIES.splice(index, 1);
}

/** فتح أو إغلاق التسجيل بضغطة واحدة من قائمة الأنشطة. */
export async function setRegistrationStatus(id: string, status: RegistrationState): Promise<void> {
  await updateActivity(id, { registrationStatus: status });
}

/** رمز حضور قصير سهل القراءة على شاشة القاعة (بلا حروف ملتبسة مثل O و 0). */
export function generateCheckInCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

/** رمز الحضور ووقت انتهائه. و null في الوقت يعني رمزًا لا ينتهي. */
export interface CheckInCode {
  code: string;
  expiresAt: string | null;
}

/** المدد المعروضة على شاشة الرمز. صفر = بلا انتهاء. */
export const CODE_DURATIONS: { minutes: number; label: string }[] = [
  { minutes: 15, label: "١٥ دقيقة" },
  { minutes: 30, label: "٣٠ دقيقة" },
  { minutes: 60, label: "ساعة" },
  { minutes: 180, label: "٣ ساعات" },
  { minutes: 0, label: "بلا انتهاء" },
];

/** ذاكرة أوقات الانتهاء في وضع البيانات التجريبية — لا خادم هناك. */
const mockExpiry = new Map<string, string | null>();

/**
 * ضبط رمز الحضور ومدّته. على الخادم يمرّ عبر دالة موثوقة تكتب في جدول محجوب
 * تمامًا عن العميل، حتى لا يقرأ أحد الرمز ويمنح نفسه نقاط حضور دون أن يحضر.
 *
 * ووقت الانتهاء يُحسب على الخادم ويُرجَع منه، لا يُحسب هنا: ساعةُ الهاتف قد
 * تكون مضبوطة على غير الحقيقة، فيُعرض على الشاشة وقتٌ يخالف ما يحكم به
 * الخادم عند المسح.
 */
export async function setCheckInCode(
  activityId: string,
  code: string,
  minutes = 0
): Promise<CheckInCode> {
  const normalized = code.trim().toUpperCase();
  if (!USE_MOCK_DATA) {
    const { data, error } = await supabase.rpc("set_check_in_code", {
      p_activity_id: activityId,
      p_code: normalized,
      p_minutes: minutes,
    });
    if (error) throw error;
    return { code: normalized, expiresAt: (data as string | null) ?? null };
  }
  const activity = MOCK_ACTIVITIES.find((item) => item.id === activityId);
  if (activity) activity.checkInCode = normalized;
  const expiresAt = minutes > 0 ? new Date(Date.now() + minutes * 60_000).toISOString() : null;
  mockExpiry.set(activityId, expiresAt);
  return { code: normalized, expiresAt };
}

/**
 * الرمز المحفوظ لنشاط ووقت انتهائه، أو null إن لم يُضبط بعد.
 *
 * والدالة موجودة على الخادم منذ أول يوم ولم يكن في التطبيق ما يناديها: صفّ
 * النشاط لا يحمل الرمز — عمدًا، فهو محجوب عن كل قراءة — فكانت خانة الرمز
 * تُفتح فارغة دائمًا، ويظنّ الإداري أن لا رمز فيولّد غيره ويُبطل ما طُبع.
 */
export async function getCheckInCode(activityId: string): Promise<CheckInCode | null> {
  if (USE_MOCK_DATA) {
    const code = MOCK_ACTIVITIES.find((item) => item.id === activityId)?.checkInCode;
    return code ? { code, expiresAt: mockExpiry.get(activityId) ?? null } : null;
  }
  const { data, error } = await supabase
    .rpc("get_check_in_code_info", { p_activity_id: activityId })
    .maybeSingle();
  if (error) throw error;
  const row = data as { code?: string; expires_at?: string | null } | null;
  return row?.code ? { code: row.code, expiresAt: row.expires_at ?? null } : null;
}

/** أعداد المسجّلين لكل نشاط — أرقام مجمّعة فقط، بلا أسماء أو أرقام هواتف. */
export async function fetchRegistrationCounts(): Promise<Record<string, number>> {
  if (USE_MOCK_DATA) {
    return Object.fromEntries(
      MOCK_ACTIVITIES.map((activity) => [activity.id, activity.registeredCount ?? 0])
    );
  }
  const { data, error } = await supabase.rpc("admin_registration_counts");
  if (error) throw error;
  const rows = (data as { activity_id: string; registered: number }[]) ?? [];
  return Object.fromEntries(rows.map((row) => [row.activity_id, row.registered]));
}

/** نتائج النشاط (المراكز الثلاثة الأولى) — تظهر في شاشة التفاصيل بعد الاعتماد. */
export async function setActivityResults(activityId: string, results: ActivityResult[]): Promise<void> {
  const cleaned = results
    .filter((result) => result.winnerName.trim().length > 0)
    .map((result) => ({ ...result, winnerName: result.winnerName.trim() }));

  if (!USE_MOCK_DATA) {
    const { error: deleteError } = await supabase
      .from("activity_results")
      .delete()
      .eq("activity_id", activityId);
    if (deleteError) throw deleteError;
    if (cleaned.length === 0) return;
    const { error } = await supabase.from("activity_results").insert(
      cleaned.map((result) => ({
        activity_id: activityId,
        rank: result.rank,
        winner_name: result.winnerName,
        note: result.note,
      }))
    );
    if (error) throw error;
    return;
  }

  const activity = MOCK_ACTIVITIES.find((item) => item.id === activityId);
  if (activity) activity.results = cleaned.length ? cleaned : undefined;
}

/* ============ الإعلانات ============ */

/** نشر إعلان من لوحة الإدارة. */
export async function addAnnouncement(
  input: Omit<Announcement, "id" | "publishedAt">
): Promise<Announcement> {
  const announcement: Announcement = {
    ...input,
    id: `ann-${Date.now()}`,
    publishedAt: new Date().toISOString().slice(0, 10),
  };

  if (!USE_MOCK_DATA) {
    const { error } = await supabase.from("announcements").insert({
      title: announcement.title,
      description: announcement.description,
      type: announcement.type,
      image: announcement.image || null,
      club: announcement.club ?? null,
      attachments: announcement.attachments ?? [],
      starts_at: announcement.startsAt ?? null,
      ends_at: announcement.endsAt ?? null,
    });
    if (error) throw error;
    return announcement;
  }

  pushMockAnnouncement(announcement);
  return announcement;
}

/** تعديل إعلان منشور — نصّه أو وقته. وبلا هذا كان النشر بابًا بلا رجعة. */
export async function updateAnnouncement(
  id: string,
  patch: Partial<Omit<Announcement, "id" | "publishedAt">>
): Promise<void> {
  if (USE_MOCK_DATA) return;
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title.trim();
  if (patch.description !== undefined) row.description = patch.description.trim();
  if (patch.type !== undefined) row.type = patch.type;
  if (patch.image !== undefined) row.image = patch.image || null;
  if (patch.club !== undefined) row.club = patch.club ?? null;
  if (patch.attachments !== undefined) row.attachments = patch.attachments;
  // الوقت يُكتب دائمًا: تفريغُه هو ما يجعل الإعلان دائمًا بعد أن كان موقوتًا.
  row.starts_at = patch.startsAt ?? null;
  row.ends_at = patch.endsAt ?? null;
  const { error } = await supabase.from("announcements").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  if (!USE_MOCK_DATA) {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  const index = MOCK_ANNOUNCEMENTS.findIndex((item) => item.id === id);
  if (index >= 0) MOCK_ANNOUNCEMENTS.splice(index, 1);
}

/* ============ المحتوى التوعوي ============ */

export async function publishAwarenessArticle(
  input: Omit<AwarenessArticle, "id" | "publishedAt">
): Promise<AwarenessArticle> {
  const article: AwarenessArticle = {
    ...input,
    id: `aw-${Date.now()}`,
    publishedAt: new Date().toISOString().slice(0, 10),
  };

  if (!USE_MOCK_DATA) {
    const { error } = await supabase.from("awareness_articles").insert({
      title: article.title,
      summary: article.summary,
      content: article.content,
      category: article.category,
    });
    if (error) throw error;
    return article;
  }

  MOCK_AWARENESS_LIBRARY.unshift(article);
  return article;
}

export async function deleteAwarenessArticle(id: string): Promise<void> {
  if (!USE_MOCK_DATA) {
    const { error } = await supabase.from("awareness_articles").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  const index = MOCK_AWARENESS_LIBRARY.findIndex((item) => item.id === id);
  if (index >= 0) MOCK_AWARENESS_LIBRARY.splice(index, 1);
}

/* ============ السؤال الثقافي الأسبوعي ============ */

/**
 * نسخة الإدارة من مسابقة الأسبوع: تتضمّن الإجابة الصحيحة، وهي القراءة الوحيدة
 * في التطبيق التي تكشفها. المستخدم العادي يقرأ عبر quiz_questions_public الذي
 * يحجب correct_option_index، وسياسة RLS لا تسمح بهذه القراءة إلا لحساب إداري.
 */
export async function fetchAdminQuiz(): Promise<WeeklyQuiz | null> {
  if (USE_MOCK_DATA) {
    return MOCK_WEEKLY_QUIZ;
  }
  const { data: quiz } = await supabase
    .from("weekly_quizzes")
    .select("*")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!quiz) return null;
  const { data: questions } = await supabase.from("quiz_questions").select("*").eq("quiz_id", quiz.id);
  return { ...(quiz as WeeklyQuiz), questions: (questions as QuizQuestion[]) ?? [] };
}

export async function addQuizQuestion(input: {
  quizId: string;
  text: string;
  options: string[];
  category: string;
  correctOptionIndex: number;
}): Promise<QuizQuestion> {
  const question: QuizQuestion = { ...input, id: `q-${Date.now()}` };

  if (!USE_MOCK_DATA) {
    const { data, error } = await supabase
      .from("quiz_questions")
      .insert({
        quiz_id: input.quizId,
        text: input.text,
        options: input.options,
        category: input.category,
        correct_option_index: input.correctOptionIndex,
      })
      .select()
      .single();
    if (error) throw error;
    return toQuizQuestion(data);
  }

  MOCK_WEEKLY_QUIZ.questions.push(question);
  return question;
}

export async function deleteQuizQuestion(id: string): Promise<void> {
  if (!USE_MOCK_DATA) {
    const { error } = await supabase.from("quiz_questions").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  const index = MOCK_WEEKLY_QUIZ.questions.findIndex((item) => item.id === id);
  if (index >= 0) MOCK_WEEKLY_QUIZ.questions.splice(index, 1);
}

/** فتح أسبوع المسابقة أو إغلاقه. */
export async function setQuizStatus(quizId: string, status: QuizStatus): Promise<void> {
  if (!USE_MOCK_DATA) {
    const { error } = await supabase.from("weekly_quizzes").update({ status }).eq("id", quizId);
    if (error) throw error;
    return;
  }
  MOCK_WEEKLY_QUIZ.status = status;
}

/* ============ الإشعارات ============ */

/** إرسال إشعار لكل المستخدمين. */
export async function sendNotification(title: string, body: string): Promise<void> {
  if (!USE_MOCK_DATA) {
    // على الخادم: دالة موثوقة تكتب صفًا لكل مستخدم ثم تُطلق FCM.
    const { error } = await supabase.rpc("broadcast_notification", { p_title: title, p_body: body });
    if (error) throw error;
    return;
  }
  pushMockNotification(title, body);
}
