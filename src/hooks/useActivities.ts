import { useQuery } from "@tanstack/react-query";
import { fetchAllActivities } from "@/services/activityService";

export function useAllActivities() {
  return useQuery({ queryKey: ["all-activities"], queryFn: fetchAllActivities });
}
