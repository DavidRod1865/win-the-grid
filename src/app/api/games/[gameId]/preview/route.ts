import { NextRequest, NextResponse } from 'next/server';
import { fetchFromAPIFootball } from '@/lib/api-football';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  try {
    // Fetch game data using NFL API
    const gameData = await fetchFromAPIFootball(`/games?id=${gameId}`);
    const game = gameData.response[0];

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Fetch head-to-head data (NFL API may have different endpoint)
    // Note: H2H endpoint may not be available for NFL API - fallback to basic info
    let h2hData;
    try {
      h2hData = await fetchFromAPIFootball(
        `/games/h2h?h2h=${game.teams.home.id}-${game.teams.away.id}`
      );
    } catch (h2hError) {
      console.warn('H2H data not available:', h2hError);
      h2hData = { response: [] };
    }

    const homeWins = h2hData.response.filter((g: any) => g.teams.home.winner).length;
    const awayWins = h2hData.response.filter((g: any) => g.teams.away.winner).length;

    const avgHomeScore = h2hData.response.length > 0
      ? Math.round(h2hData.response.reduce((sum: number, g: any) => sum + (g.scores.home.total || 0), 0) / h2hData.response.length)
      : 0;
    const avgAwayScore = h2hData.response.length > 0
      ? Math.round(h2hData.response.reduce((sum: number, g: any) => sum + (g.scores.away.total || 0), 0) / h2hData.response.length)
      : 0;

    return NextResponse.json(
      {
        h2h: h2hData.response.length > 0
          ? `${game.teams.home.name} ${homeWins} - ${awayWins} ${game.teams.away.name}`
          : 'No previous matchups',
        avgScore: h2hData.response.length > 0
          ? `${avgHomeScore} - ${avgAwayScore}`
          : 'N/A',
        recent: h2hData.response.slice(0, 5),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    );
  } catch (error) {
    console.error('Failed to fetch preview:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch preview';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
