import { useQuery } from "@tanstack/react-query";
import {
  fetchHeroActivity,
  fetchLatestAnnouncements,
  fetchThisWeekActivities,
  fetchTodayAwareness,
  fetchUpcomingActivities,
} from "@/services/activityService";

export function useHeroActivity() {
  return useQuery({ queryKey: ["hero-activity"], queryFn: fetchHeroActivity });
}

export function useUpcomingActivities(excludeId?: string) {
  return useQuery({
    queryKey: ["upcoming-activities", excludeId],
    queryFn: () => fetchUpcomingActivities(excludeId),
  });
}

export function useLatestAnnouncements(limit = 3) {
  return useQuery({ queryKey: ["latest-announcements", limit], queryFn: () => fetchLatestAnnouncements(limit) });
}

export function useTodayAwareness() {
  return useQuery({ queryKey: ["today-awareness"], queryFn: fetchTodayAwareness });
}

export function useThisWeekActivities() {
  return useQuery({ queryKey: ["this-week-activities"], queryFn: fetchThisWeekActivities });
}
