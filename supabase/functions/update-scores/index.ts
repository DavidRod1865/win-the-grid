// Supabase Edge Function for updating game scores
// Triggered by pg_cron every minute

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// American Football (NFL) API - NOT the soccer API!
const API_FOOTBALL_BASE = 'https://v1.american-football.api-sports.io';
const API_KEY = Deno.env.get('API_FOOTBALL_KEY');

async function fetchFromAPIFootball(endpoint: string) {
  if (!API_KEY) {
    throw new Error('API_FOOTBALL_KEY is required');
  }

  const response = await fetch(`${API_FOOTBALL_BASE}${endpoint}`, {
    headers: {
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': 'v1.american-football.api-sports.io',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API-Football error:', response.status, errorText);
    throw new Error(`API-Football request failed: ${response.statusText}`);
  }

  return response.json();
}

Deno.serve(async (req) => {
  try {
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all games that are currently live or scheduled to start soon
    const { data: activeGames, error: fetchError } = await supabase
      .from('games')
      .select('id, status, home_score, away_score')
      .in('status', ['NS', 'LIVE', '1H', '2H', 'HT', 'ET', 'BT', 'P', 'SUSP', 'INT'])
      .order('scheduled_time', { ascending: true });

    if (fetchError) {
      console.error('Error fetching active games:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch active games' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!activeGames || activeGames.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active games to update' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
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
      .map(async (update) => {
        const game = activeGames.find(g => g.id === update!.id);

        // Check if scores actually changed
        const hasChanged =
          game!.home_score !== update!.home_score ||
          game!.away_score !== update!.away_score ||
          game!.status !== update!.status;

        if (!hasChanged) return null;

        const { error } = await supabase
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

        if (error) {
          console.error(`Failed to update game ${update!.id}:`, error);
          return null;
        }

        return update!.id;
      });

    const results = await Promise.all(updatePromises);
    const updated = results.filter(r => r !== null).length;

    return new Response(
      JSON.stringify({
        success: true,
        updated,
        total: activeGames.length,
        timestamp: new Date().toISOString(),
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Score update cron failed:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update scores', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
