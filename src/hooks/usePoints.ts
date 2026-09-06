import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchLeaderboard, fetchPointsBalance, fetchPointsHistory } from "@/services/pointsService";
import { useAuth } from "./useAuth";

export function usePointsBalance() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["points-balance", user?.id],
    queryFn: () => fetchPointsBalance(user!.id),
    enabled: Boolean(user),
  });
}

export function usePointsHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["points-history", user?.id],
    queryFn: () => fetchPointsHistory(user!.id),
    enabled: Boolean(user),
  });
}

export function useLeaderboard() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["leaderboard", user?.name],
    queryFn: () => fetchLeaderboard(user?.name),
  });
}

/** يُستدعى بعد أي عملية تمنح نقاطًا (إجابة صحيحة، تسجيل حضور) لتحديث الرصيد فورًا. */
export function useRefreshPoints() {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries({ queryKey: ["points-balance"] });
    client.invalidateQueries({ queryKey: ["points-history"] });
    client.invalidateQueries({ queryKey: ["leaderboard"] });
  };
}
