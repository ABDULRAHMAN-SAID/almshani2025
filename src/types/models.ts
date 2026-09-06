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
