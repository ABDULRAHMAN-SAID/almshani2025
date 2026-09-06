import type { Activity, Announcement } from "@/types/models";
import { USE_MOCK_DATA } from "./config";
import { MOCK_ACTIVITIES } from "./mockData";
import { pushMockAnnouncement, pushMockNotification } from "./notificationService";
import { supabase } from "./supabase";

type NewActivityInput = Omit<Activity, "id" | "createdAt">;

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
      .insert({
        title: activity.title,
        description: activity.description,
        category: activity.category,
        date: activity.date,
        start_time: activity.startTime,
        end_time: activity.endTime,
        location: activity.location,
        capacity: activity.capacity,
        registration_status: activity.registrationStatus,
        is_annual: activity.isAnnual ?? false,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Activity;
  }

  MOCK_ACTIVITIES.push(activity);
  return activity;
}

/** نشر إعلان من لوحة الإدارة. */
export async function addAnnouncement(input: Omit<Announcement, "id" | "publishedAt">): Promise<Announcement> {
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
    });
    if (error) throw error;
    return announcement;
  }

  pushMockAnnouncement(announcement);
  return announcement;
}

/** إرسال إشعار لكل المستخدمين. */
export async function sendNotification(title: string, body: string): Promise<void> {
  if (!USE_MOCK_DATA) {
    // في الإنتاج تُرسل عبر دالة على الخادم تكتب صفًا لكل مستخدم ثم تُطلق FCM.
    const { error } = await supabase.rpc("broadcast_notification", { p_title: title, p_body: body });
    if (error) throw error;
    return;
  }
  pushMockNotification(title, body);
}
