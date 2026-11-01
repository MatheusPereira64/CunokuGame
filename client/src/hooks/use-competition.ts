import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { PLAYER_KEY_HEADER } from "@shared/competition";
import { apiUrl } from "@/lib/gameServer";
import { getPlayerKey } from "@/lib/playerKey";

async function fetchWithKey(path: string): Promise<unknown> {
  const res = await fetch(apiUrl(path), { headers: { [PLAYER_KEY_HEADER]: getPlayerKey() } });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export function useDailyStatus(enabled: boolean) {
  return useQuery({
    queryKey: [api.daily.status.path],
    enabled,
    staleTime: 0,
    retry: false,
    queryFn: async () => api.daily.status.responses[200].parse(await fetchWithKey(api.daily.status.path)),
  });
}

export function useLeagueStandings(enabled: boolean) {
  return useQuery({
    queryKey: [api.league.standings.path],
    enabled,
    staleTime: 0,
    retry: false,
    queryFn: async () =>
      api.league.standings.responses[200].parse(await fetchWithKey(api.league.standings.path)),
  });
}

export function useStartDaily() {
  return useMutation({
    mutationFn: async (playerName: string) => {
      const body = api.daily.start.input.parse({ playerKey: getPlayerKey(), playerName });
      const res = await fetch(apiUrl(api.daily.start.path), {
        method: api.daily.start.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      return api.daily.start.responses[200].parse(await res.json());
    },
  });
}

/** "2d 5h", "5h 12m" ou "12m". */
export function formatTimeLeft(until: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.floor((Date.parse(until) - now) / 60000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}
