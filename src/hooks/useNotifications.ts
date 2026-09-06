import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAllAnnouncements, fetchNotifications } from "@/services/notificationService";
import { useAuth } from "./useAuth";

export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => fetchNotifications(user!.id),
    enabled: Boolean(user),
  });
}

export function useUnreadCount() {
  const { data } = useNotifications();
  return (data ?? []).filter((notification) => !notification.read).length;
}

export function useAnnouncements() {
  return useQuery({ queryKey: ["announcements-all"], queryFn: fetchAllAnnouncements });
}

export function useRefreshNotifications() {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries({ queryKey: ["notifications"] });
    client.invalidateQueries({ queryKey: ["announcements-all"] });
    client.invalidateQueries({ queryKey: ["latest-announcements"] });
  };
}
