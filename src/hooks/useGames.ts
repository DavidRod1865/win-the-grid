import useSWR from 'swr';

interface UseGamesOptions {
  league?: string;
  season?: string;
}

interface GameTeam {
  name: string;
  abbreviation: string;
  logo: string;
}

interface Game {
  gameId: string;
  title: string;
  date: string;
  status: string;
  homeTeam: GameTeam;
  awayTeam: GameTeam;
  scores: {
    home: number;
    away: number;
  };
}

interface GamesResponse {
  games: Game[];
}

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error('Failed to fetch games');
  return r.json();
});

export function useGames({ league = 'nfl', season = '2025' }: UseGamesOptions = {}) {
  const { data, error, isLoading, mutate } = useSWR<GamesResponse>(
    `/api/games?league=${league}&season=${season}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 minute deduplication
      refreshInterval: 0, // No automatic refresh
      shouldRetryOnError: true,
      errorRetryCount: 3,
    }
  );

  return {
    games: data?.games || [],
    isLoading,
    error,
    refresh: mutate, // Manual refresh function
  };
}
