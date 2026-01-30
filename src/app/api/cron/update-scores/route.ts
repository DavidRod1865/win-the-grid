import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Store ETags in memory (in production, consider Redis)
const etagCache = new Map<string, string>();

// Store last known scores to avoid unnecessary database updates
const scoreCache = new Map<string, { home: number; away: number; status: string }>();

export async function GET() {
  try {
    // Get all games that are currently live or scheduled to start soon
    const { data: activeGames } = await supabase
      .from('games')
      .select('id, status, home_score, away_score, last_score_update')
      .in('status', ['NS', 'LIVE', '1H', '2H', 'HT', 'ET', 'BT', 'P', 'SUSP', 'INT'])
      .order('scheduled_time', { ascending: true });

    if (!activeGames || activeGames.length === 0) {
      return NextResponse.json({ message: 'No active games to update' });
    }

    let unchangedCount = 0;
    let notModifiedCount = 0;

    // Fetch scores for all games using NFL API with conditional requests
    const updates = await Promise.all(
      activeGames.map(async (game) => {
        try {
          // Make conditional request with If-None-Match header
          const cachedEtag = etagCache.get(game.id);
          const headers: HeadersInit = {
            'x-rapidapi-key': process.env.API_FOOTBALL_KEY!,
            'x-rapidapi-host': 'v1.american-football.api-sports.io',
          };

          if (cachedEtag) {
            headers['If-None-Match'] = cachedEtag;
          }

          const response = await fetch(
            `https://v1.american-football.api-sports.io/games?id=${game.id}`,
            { headers, cache: 'no-store' }
          );

          // 304 Not Modified - data hasn't changed on server
          if (response.status === 304) {
            console.log(`Game ${game.id}: No changes (304 Not Modified)`);
            notModifiedCount++;
            return null;
          }

          if (!response.ok) {
            console.error(`Game ${game.id}: HTTP ${response.status}`);
            return null;
          }

          // Store new ETag for future requests
          const etag = response.headers.get('etag');
          if (etag) {
            etagCache.set(game.id, etag);
          }

          const data = await response.json();
          const gameData = data.response[0];

          if (!gameData) return null;

          const newScores = {
            home: gameData.scores.home.total || 0,
            away: gameData.scores.away.total || 0,
            status: gameData.game.status.short,
          };

          // Check if scores actually changed
          const hasChanged =
            game.home_score !== newScores.home ||
            game.away_score !== newScores.away ||
            game.status !== newScores.status;

          if (!hasChanged) {
            console.log(`Game ${game.id}: No score changes`);
            unchangedCount++;
            // Update score cache even if unchanged
            scoreCache.set(game.id, newScores);
            return null;
          }

          // Update score cache
          scoreCache.set(game.id, newScores);

          return {
            id: game.id,
            status: newScores.status,
            home_score: newScores.home,
            away_score: newScores.away,
            current_period: gameData.game.status.elapsed
              ? `Q${Math.ceil(gameData.game.status.elapsed / 15)}`
              : 'Pre-Game',
            last_score_update: new Date().toISOString(),
          };
        } catch (error) {
          console.error(`Failed to fetch game ${game.id}:`, error);
          return null;
        }
      })
    );

    // Update games table only for changed games (this triggers Realtime for all watching grids)
    const changedGames = updates.filter(u => u !== null);

    if (changedGames.length > 0) {
      await Promise.all(
        changedGames.map((update) =>
          supabase
            .from('games')
            .update({
              status: update!.status,
              home_score: update!.home_score,
              away_score: update!.away_score,
              current_period: update!.current_period,
              last_score_update: update!.last_score_update,
              updated_at: new Date().toISOString(),
            })
            .eq('id', update!.id)
        )
      );
    }

    return NextResponse.json({
      success: true,
      checked: activeGames.length,
      notModified: notModifiedCount,
      unchanged: unchangedCount,
      updated: changedGames.length,
      cacheEfficiency: `${Math.round(((notModifiedCount + unchangedCount) / activeGames.length) * 100)}%`,
    });
  } catch (error) {
    console.error('Score update cron failed:', error);
    return NextResponse.json({ error: 'Failed to update scores' }, { status: 500 });
  }
}
