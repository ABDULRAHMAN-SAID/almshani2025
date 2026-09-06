import type { AppNotification, Announcement } from "@/types/models";
import { USE_MOCK_DATA } from "./config";
import { MOCK_ANNOUNCEMENTS, MOCK_NOTIFICATIONS } from "./mockData";
import { supabase } from "./supabase";

/** نسخة قابلة للتعديل في وضع البيانات التجريبية (لتعليم الإشعار كمقروء). */
const mockInbox: AppNotification[] = [...MOCK_NOTIFICATIONS];

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  if (USE_MOCK_DATA) {
    return [...mockInbox].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data as AppNotification[]) ?? [];
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    const item = mockInbox.find((notification) => notification.id === notificationId);
    if (item) item.read = true;
    return;
  }
  await supabase.from("notifications").update({ read: true }).eq("id", notificationId).eq("user_id", userId);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    mockInbox.forEach((notification) => {
      notification.read = true;
    });
    return;
  }
  await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
}

/** يضيف إشعارًا محليًا — تستخدمه لوحة الإدارة في وضع البيانات التجريبية. */
export function pushMockNotification(title: string, body: string): void {
  mockInbox.unshift({
    id: `n-${Date.now()}`,
    userId: "me",
    title,
    body,
    read: false,
    createdAt: new Date().toISOString().slice(0, 10),
  });
}

export async function fetchAllAnnouncements(): Promise<Announcement[]> {
  if (USE_MOCK_DATA) {
    return [...MOCK_ANNOUNCEMENTS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .order("published_at", { ascending: false });
  return (data as Announcement[]) ?? [];
}

/** يضيف إعلانًا محليًا — لوحة الإدارة في وضع البيانات التجريبية. */
export function pushMockAnnouncement(announcement: Announcement): void {
  MOCK_ANNOUNCEMENTS.unshift(announcement);
}
