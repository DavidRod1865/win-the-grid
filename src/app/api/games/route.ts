import { NextRequest, NextResponse } from 'next/server';
import { fetchFromAPIFootball, LEAGUE_IDS } from '@/lib/api-football';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const league = searchParams.get('league') || 'nfl';
  // Current NFL season is 2025 (Sept 2025 - Feb 2026)
  const season = searchParams.get('season') || '2025';

  try {
    const leagueId = LEAGUE_IDS[league as keyof typeof LEAGUE_IDS];
    if (!leagueId) {
      return NextResponse.json({ error: 'Invalid league' }, { status: 400 });
    }

    // Use /games endpoint for NFL API (not /fixtures which is for soccer)
    const data = await fetchFromAPIFootball(
      `/games?league=${leagueId}&season=${season}`
    );

    // Get current date (start of today in EST)
    const now = new Date();
    const todayEST = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    todayEST.setHours(0, 0, 0, 0);

    // Transform to our format - NFL API structure is different from soccer
    const allGames = data.response.map((game: any) => {
      // Use the timestamp (Unix timestamp in seconds) and convert to ISO string
      // This preserves the exact date/time from the API
      let gameDate;
      if (game.game.date.timestamp) {
        // Convert Unix timestamp (seconds) to milliseconds and create Date
        gameDate = new Date(game.game.date.timestamp * 1000).toISOString();
      } else if (game.game.date.time) {
        // Fallback: combine date and time fields (both in UTC)
        gameDate = `${game.game.date.date}T${game.game.date.time}:00Z`;
      } else {
        // Last resort: just use the date
        gameDate = game.game.date.date || game.game.date;
      }

      console.log('Game:', game.teams.away.name, '@', game.teams.home.name);
      console.log('  Timestamp:', game.game.date.timestamp, '→', gameDate);

      return {
        gameId: game.game.id.toString(),
        title: `${game.teams.away.name} @ ${game.teams.home.name}`,
        date: gameDate,
        status: game.game.status.short, // NS, LIVE, FT, etc.
        homeTeam: {
          name: game.teams.home.name,
          abbreviation: game.teams.home.name.substring(0, 3).toUpperCase(),
          logo: game.teams.home.logo,
        },
        awayTeam: {
          name: game.teams.away.name,
          abbreviation: game.teams.away.name.substring(0, 3).toUpperCase(),
          logo: game.teams.away.logo,
        },
        scores: {
          home: game.scores.home.total || 0,
          away: game.scores.away.total || 0,
        },
      };
    });

    // Filter to show only games from today forward
    const games = allGames.filter((game: any) => {
      const gameDate = new Date(game.date);
      return gameDate >= todayEST;
    });

    return NextResponse.json(
      { games },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching games:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch games';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
