import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { GridState } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Hook to subscribe to real-time updates for a specific grid
 * Only works for premium grids
 *
 * @param gridId - The ID of the grid to subscribe to
 * @param onUpdate - Callback function when grid is updated
 * @param enabled - Whether to enable real-time updates (default: true)
 */
export function useGridRealtime(
  gridId: string | undefined,
  onUpdate: (grid: Partial<GridState>) => void,
  enabled: boolean = true
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!gridId || !enabled) {
      return;
    }

    // Create subscription channel
    const channel = supabase
      .channel(`grid:${gridId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grids',
          filter: `id=eq.${gridId}`,
        },
        (payload) => {
          console.log('Grid update received:', payload);

          if (payload.eventType === 'UPDATE' && payload.new) {
            // Transform Supabase data to GridState format
            const updatedData: Partial<GridState> = {
              currentScores: payload.new.current_scores || [],
              gameWinners: payload.new.game_winners || [],
              gameState: payload.new.state,
              numbersGenerated: payload.new.numbers_generated,
              rowNumbers: payload.new.row_numbers || [],
              colNumbers: payload.new.col_numbers || [],
            };

            onUpdate(updatedData);
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    channelRef.current = channel;

    // Cleanup subscription on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [gridId, enabled, onUpdate]);

  return {
    isConnected: channelRef.current?.state === 'joined',
    disconnect: () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    },
  };
}
