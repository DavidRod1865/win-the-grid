import useSWR from 'swr';

interface GamePreview {
  h2h: string;
  avgScore: string;
  recent: Array<any>;
}

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error('Failed to fetch game preview');
  return r.json();
});

export function useGamePreview(gameId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<GamePreview>(
    gameId ? `/api/games/${gameId}/preview` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5 minutes
      refreshInterval: 0,
      shouldRetryOnError: true,
      errorRetryCount: 2,
    }
  );

  return {
    preview: data,
    isLoading,
    error,
    refresh: mutate,
  };
}
