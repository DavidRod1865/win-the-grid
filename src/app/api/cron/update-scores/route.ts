import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchFromAPIFootball } from '@/lib/api-football';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Get all games that are currently live or scheduled to start soon
    const { data: activeGames } = await supabase
      .from('games')
      .select('id, status, home_score, away_score')
      .in('status', ['NS', 'LIVE', '1H', '2H', 'HT', 'ET', 'BT', 'P', 'SUSP', 'INT'])
      .order('scheduled_time', { ascending: true });

    if (!activeGames || activeGames.length === 0) {
      return NextResponse.json({ message: 'No active games to update' });
    }

    // Fetch scores for all games using NFL API
    const updates = await Promise.all(
      activeGames.map(async (game) => {
        try {
          const data = await fetchFromAPIFootball(`/games?id=${game.id}`);
          const gameData = data.response[0];

          if (!gameData) return null;

          return {
            id: game.id,
            status: gameData.game.status.short,
            home_score: gameData.scores.home.total || 0,
            away_score: gameData.scores.away.total || 0,
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

    // Update games table (this triggers Realtime for all watching grids)
    const updatePromises = updates
      .filter(u => u !== null)
      .map((update) => {
        const game = activeGames.find(g => g.id === update!.id);

        // Check if scores actually changed
        const hasChanged =
          game!.home_score !== update!.home_score ||
          game!.away_score !== update!.away_score ||
          game!.status !== update!.status;

        if (!hasChanged) return null;

        return supabase
          .from('games')
          .update({
            status: update!.status,
            home_score: update!.home_score,
            away_score: update!.away_score,
            current_period: update!.current_period,
            last_score_update: update!.last_score_update,
            updated_at: new Date().toISOString(),
          })
          .eq('id', update!.id);
      });

    await Promise.all(updatePromises.filter(p => p !== null));

    return NextResponse.json({
      success: true,
      updated: updatePromises.filter(p => p !== null).length,
      total: activeGames.length,
    });
  } catch (error) {
    console.error('Score update cron failed:', error);
    return NextResponse.json({ error: 'Failed to update scores' }, { status: 500 });
  }
}
