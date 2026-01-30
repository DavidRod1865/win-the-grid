'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Game } from '@/types';

export function useLiveScores(gameId?: string) {
  const [game, setGame] = useState<Game | null>(null);

  useEffect(() => {
    if (!gameId) return;

    // Subscribe to real-time updates for this game
    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          // Game updated! Update local state
          setGame({
            id: payload.new.id,
            league: payload.new.league,
            season: payload.new.season,
            scheduledTime: payload.new.scheduled_time,
            status: payload.new.status,
            homeTeam: {
              name: payload.new.home_team_name,
              logo: payload.new.home_team_logo,
              abbreviation: payload.new.home_team_abbreviation,
            },
            awayTeam: {
              name: payload.new.away_team_name,
              logo: payload.new.away_team_logo,
              abbreviation: payload.new.away_team_abbreviation,
            },
            homeScore: payload.new.home_score,
            awayScore: payload.new.away_score,
            currentPeriod: payload.new.current_period,
            lastScoreUpdate: payload.new.last_score_update,
          });
        }
      )
      .subscribe();

    // Fetch initial game data
    supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single()
      .then(({ data }) => {
        if (data) {
          setGame({
            id: data.id,
            league: data.league,
            season: data.season,
            scheduledTime: data.scheduled_time,
            status: data.status,
            homeTeam: {
              name: data.home_team_name,
              logo: data.home_team_logo,
              abbreviation: data.home_team_abbreviation,
            },
            awayTeam: {
              name: data.away_team_name,
              logo: data.away_team_logo,
              abbreviation: data.away_team_abbreviation,
            },
            homeScore: data.home_score,
            awayScore: data.away_score,
            currentPeriod: data.current_period,
            lastScoreUpdate: data.last_score_update,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return game;
}
