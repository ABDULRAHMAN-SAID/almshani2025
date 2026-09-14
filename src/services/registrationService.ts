import type { Activity } from "@/types/models";
import { useRegistrationStore } from "@/store/registrationStore";
import { USE_MOCK_DATA } from "./config";
import { supabase } from "./supabase";

export type RegistrationOutcome = "registered" | "cancelled" | "full" | "closed" | "already";

/**
 * يقرر ما إذا كان التسجيل ممكنًا حاليًا في هذا النشاط.
 *
 * يأخذ مفتاح التشغيل وسيطًا لا يقرؤه بنفسه: المفتاح صار على الخادم فقراءته
 * غير متزامنة، وهذه الدالة تُستدعى أثناء الرسم. والشاشة تملكه أصلًا من
 * useFeatures. والمنع الحقيقي في سياسة الخادم على أي حال.
 */
export function canRegister(
  activity: Activity,
  registrationEnabled = true
): { allowed: boolean; reason?: RegistrationOutcome } {
  if (!registrationEnabled) return { allowed: false, reason: "closed" };
  if (activity.registrationStatus === "full") return { allowed: false, reason: "full" };
  if (activity.registrationStatus !== "open") return { allowed: false, reason: "closed" };
  if (activity.capacity && (activity.registeredCount ?? 0) >= activity.capacity) {
    return { allowed: false, reason: "full" };
  }
  return { allowed: true };
}

export async function registerForActivity(
  userId: string,
  activity: Activity
): Promise<RegistrationOutcome> {
  const store = useRegistrationStore.getState();
  if (store.isRegistered(activity.id)) return "already";

  const check = canRegister(activity);
  if (!check.allowed) return check.reason!;

  if (!USE_MOCK_DATA) {
    const { error } = await supabase
      .from("registrations")
      .insert({ user_id: userId, activity_id: activity.id });
    if (error) throw error;
  }
  store.register(activity.id);
  return "registered";
}

export async function cancelRegistration(userId: string, activityId: string): Promise<RegistrationOutcome> {
  if (!USE_MOCK_DATA) {
    const { error } = await supabase
      .from("registrations")
      .delete()
      .eq("user_id", userId)
      .eq("activity_id", activityId);
    if (error) throw error;
  }
  useRegistrationStore.getState().cancel(activityId);
  return "cancelled";
}
