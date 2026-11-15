import { useQuery } from "@tanstack/react-query";
import { api, type Plan } from "@/lib/api";
import { useStore } from "@/lib/store";

export function usePlan() {
  const { user, revision } = useStore();
  return useQuery({ queryKey: ["home-plan", user?.id, revision], queryFn: () => api<Plan>("/plan"), enabled: !!user, staleTime: 0, retry: 1 });
}
