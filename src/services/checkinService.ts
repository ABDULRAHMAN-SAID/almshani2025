import type { PointsReason } from "@/types/models";
import { USE_MOCK_DATA } from "./config";
import { MOCK_ACTIVITIES } from "./mockData";
import { recordMockPoints } from "./pointsService";
import { supabase } from "./supabase";

const checkedInMock = new Set<string>();

export interface CheckInResult {
  success: boolean;
  pointsEarned: number;
  alreadyCheckedIn: boolean;
  activityTitle?: string;
}

/** يحاكي دالة submit_check_in الموثوقة: يتحقق من الرمز مقابل رمز النشاط فقط. */
export async function submitCheckIn(
  activityId: string,
  code: string,
  reason: PointsReason = "lecture_attendance"
): Promise<CheckInResult> {
  if (USE_MOCK_DATA) {
    const activity = MOCK_ACTIVITIES.find((a) => a.id === activityId);
    if (!activity || !activity.checkInCode || activity.checkInCode !== code.trim().toUpperCase()) {
      return { success: false, pointsEarned: 0, alreadyCheckedIn: false };
    }
    if (checkedInMock.has(activityId)) {
      return { success: false, pointsEarned: 0, alreadyCheckedIn: true, activityTitle: activity.title };
    }
    checkedInMock.add(activityId);
    recordMockPoints({ reason, points: 10, activityTitle: activity.title });
    return { success: true, pointsEarned: 10, alreadyCheckedIn: false, activityTitle: activity.title };
  }

  const { data, error } = await supabase
    .rpc("submit_check_in", { p_activity_id: activityId, p_code: code.trim().toUpperCase(), p_reason: reason })
    .single();
  if (error) throw error;
  const row = data as { success: boolean; points_earned: number };
  return { success: row.success, pointsEarned: row.points_earned, alreadyCheckedIn: !row.success && row.points_earned === 0 };
}

/** يبحث عن نشاط برمز حضور معروف — يُستخدم لملء بيانات شاشة تسجيل الحضور تجريبيًا. */
export function findDemoCheckInActivity() {
  return MOCK_ACTIVITIES.find((a) => Boolean(a.checkInCode)) ?? null;
}
