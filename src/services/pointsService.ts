import type { LeaderboardEntry, PointsTransaction } from "@/types/models";
import { USE_MOCK_DATA } from "./config";
import { MOCK_LEADERBOARD, MOCK_POINTS_TRANSACTIONS } from "./mockData";
import { supabase } from "./supabase";

/**
 * في وضع البيانات التجريبية نحتفظ بحركات النقاط في الذاكرة (تُضاف إليها حركة
 * جديدة عند الإجابة الصحيحة على سؤال أو تسجيل حضور)، لمحاكاة صادقة للسلوك
 * الحقيقي دون الحاجة لخادم فعلي.
 */
const mockLedger: PointsTransaction[] = [...MOCK_POINTS_TRANSACTIONS];

export function recordMockPoints(tx: Omit<PointsTransaction, "id" | "userId" | "createdAt">) {
  mockLedger.unshift({
    id: `pt-${Date.now()}`,
    userId: "me",
    createdAt: new Date().toISOString(),
    ...tx,
  });
}

export async function fetchPointsHistory(userId: string): Promise<PointsTransaction[]> {
  if (USE_MOCK_DATA) {
    return [...mockLedger].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const { data } = await supabase
    .from("points_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data as PointsTransaction[]) ?? [];
}

export async function fetchPointsBalance(userId: string): Promise<number> {
  const history = await fetchPointsHistory(userId);
  return history.reduce((sum, tx) => sum + tx.points, 0);
}

export async function fetchLeaderboard(currentUserName?: string): Promise<LeaderboardEntry[]> {
  if (USE_MOCK_DATA) {
    const myTotal = mockLedger.reduce((sum, tx) => sum + tx.points, 0);
    const withMe: LeaderboardEntry[] = [
      ...MOCK_LEADERBOARD,
      { userId: "me", name: currentUserName ?? "مستخدم جديد", totalPoints: myTotal, rank: 0 },
    ]
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
    return withMe;
  }
  const { data } = await supabase
    .from("leaderboard_view")
    .select("*")
    .order("total_points", { ascending: false })
    .limit(20);
  return (
    (data as { user_id: string; name: string; total_points: number }[])?.map((row, index) => ({
      userId: row.user_id,
      name: row.name,
      totalPoints: row.total_points,
      rank: index + 1,
    })) ?? []
  );
}
