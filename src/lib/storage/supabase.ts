import { GridState, UserSubscription, PaymentTransaction } from '@/types';
import { StorageProvider, FeatureFlags, StorageType } from './types';
import { supabase } from '../supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseProvider implements StorageProvider {
  private supabase: SupabaseClient;
  
  constructor() {
    this.supabase = supabase;
    console.log('SupabaseProvider: Initialized with Supabase client');
  }

  /**
   * Migrate localStorage grid to Supabase (called during signup)
   */
  async migrateLocalStorageGrid(gridState: GridState): Promise<string> {
    const { MigrationTransformer } = await import('./migration');
    
    // Transform and validate data
    const supabaseData = MigrationTransformer.transformGridForSupabase(gridState);
    const validation = MigrationTransformer.validateMigrationData(supabaseData);
    
    if (!validation.isValid) {
      throw new Error(`Migration validation failed: ${validation.errors.join(', ')}`);
    }

    // Get current user
    const { data: { user }, error: authError } = await this.supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User must be authenticated to migrate data');
    }
    
    // Create new grid record directly (since RPC functions might not exist yet)
    const { data: gridData, error: createError } = await this.supabase
      .from('grids')
      .insert({
        title: supabaseData.title,
        created_by: user.id,
        sport_id: supabaseData.sport_id,
        game_type_id: supabaseData.game_type_id,
        price_per_box: supabaseData.price_per_box,
        payout_template: supabaseData.payout_template,
        payout_rules: supabaseData.payout_rules,
        teams: supabaseData.teams,
        participants: supabaseData.participants,
        row_numbers: supabaseData.row_numbers,
        col_numbers: supabaseData.col_numbers,
        numbers_generated: supabaseData.numbers_generated,
        winners: supabaseData.winners,
        current_scores: supabaseData.current_scores,
        side_pools: supabaseData.side_pools,
        state: supabaseData.state,
        is_premium: supabaseData.is_premium,
        payment_type: supabaseData.payment_type,
        live_scoring_enabled: false
      })
      .select('id')
      .single();
    
    if (createError) {
      console.error('Migration error:', createError);
      throw new Error(`Failed to create grid: ${createError.message}`);
    }

    const gridId = gridData.id;

    return gridId;
  }

  async saveGrid(gridState: GridState): Promise<string> {
    const { MigrationTransformer } = await import('./migration');
    
    // Get current user
    const { data: { user }, error: authError } = await this.supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User must be authenticated to save grid');
    }
    
    // Transform data for Supabase
    const supabaseData = MigrationTransformer.transformGridForSupabase(gridState);
    
    if (gridState.id && gridState.id !== 'local-grid') {
      // Update existing grid
      const { error } = await this.supabase
        .from('grids')
        .update({
          title: supabaseData.title,
          price_per_box: supabaseData.price_per_box,
          payout_template: supabaseData.payout_template,
          payout_rules: supabaseData.payout_rules,
          teams: supabaseData.teams,
          participants: supabaseData.participants,
          row_numbers: supabaseData.row_numbers,
          col_numbers: supabaseData.col_numbers,
          numbers_generated: supabaseData.numbers_generated,
          winners: supabaseData.winners,
          current_scores: supabaseData.current_scores,
          side_pools: supabaseData.side_pools,
          state: supabaseData.state,
          updated_at: new Date().toISOString()
        })
        .eq('id', gridState.id)
        .eq('created_by', user.id);
      
      if (error) {
        console.error('Save grid error:', error);
        throw new Error(`Failed to save grid: ${error.message}`);
      }
      return gridState.id;
    } else {
      // Create new grid - use the same logic as migrateLocalStorageGrid
      return this.migrateLocalStorageGrid(gridState);
    }
  }

  async loadGrid(gridId: string): Promise<GridState | null> {
    try {
      const { data, error } = await this.supabase
        .from('grids')
        .select('*')
        .eq('id', gridId)
        .single();
      
      if (error) {
        console.error('Failed to load grid:', error);
        return null;
      }
      
      return this.transformSupabaseToGridState(data);
    } catch (error) {
      console.error('Error loading grid:', error);
      return null;
    }
  }

  async loadUserGrids(): Promise<GridState[]> {
    try {
      // Get current user
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      
      if (authError || !user) {
        console.warn('User not authenticated for loading grids');
        return [];
      }

      // Load all grids created by this user
      const { data, error } = await this.supabase
        .from('grids')
        .select('*')
        .eq('created_by', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Failed to load user grids:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Transform each grid back to GridState format
      return data.map(grid => this.transformSupabaseToGridState(grid));
    } catch (error) {
      console.error('Error loading user grids:', error);
      return [];
    }
  }

  async deleteGrid(gridId: string): Promise<void> {
    // TODO: Implement grid deletion
    throw new Error('Supabase integration not yet implemented. API keys needed.');
  }

  async shareGrid(gridId: string): Promise<{ joinCode: string; shareUrl: string }> {
    try {
      // Get current user
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User must be authenticated to share grid');
      }

      // Check if grid already has a join code
      const { data: existingGrid, error: fetchError } = await this.supabase
        .from('grids')
        .select('share_code')
        .eq('id', gridId)
        .eq('created_by', user.id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch grid: ${fetchError.message}`);
      }

      let joinCode = existingGrid.share_code;

      // Generate join code if not exists
      if (!joinCode) {
        joinCode = this.generateJoinCode();
        
        const { error: updateError } = await this.supabase
          .from('grids')
          .update({
            share_code: joinCode
          })
          .eq('id', gridId)
          .eq('created_by', user.id);

        if (updateError) {
          throw new Error(`Failed to update grid: ${updateError.message}`);
        }
      }

      const shareUrl = `${window.location.origin}/share/${joinCode}`;
      return { joinCode, shareUrl };
    } catch (error) {
      console.error('Error sharing grid:', error);
      throw error;
    }
  }

  async getGridByJoinCode(joinCode: string): Promise<GridState | null> {
    try {
      const { data, error } = await this.supabase
        .from('grids')
        .select('*')
        .eq('share_code', joinCode.toUpperCase())
        .eq('is_premium', true)
        .single();

      if (error) {
        console.error('Failed to load grid by join code:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      // Transform to GridState and mark as view-only
      const gridState = this.transformSupabaseToGridState(data);
      return {
        ...gridState,
        isViewOnly: true,
        accessLevel: 'view-only' as const
      };
    } catch (error) {
      console.error('Error loading grid by join code:', error);
      return null;
    }
  }

  async subscribeToGridUpdates(gridId: string, callback: (grid: GridState) => void): Promise<() => void> {
    const channel = this.supabase
      .channel(`grid:${gridId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grids',
          filter: `id=eq.${gridId}`,
        },
        async (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            // Load the full grid state after update
            const grid = await this.loadGrid(gridId);
            if (grid) {
              callback(grid);
            }
          }
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      this.supabase.removeChannel(channel);
    };
  }

  async getUserSubscription(): Promise<UserSubscription | null> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        return null;
      }

      const { data, error } = await this.supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        // Return default free subscription if none exists
        return {
          userId: user.id,
          tier: 'free',
          paymentStatus: 'free',
          seasonPassActive: false,
        };
      }

      return {
        userId: data.user_id,
        tier: data.season_pass_active ? 'paid' : 'free',
        paymentStatus: data.season_pass_active ? 'season-pass' : 'free',
        seasonPassActive: data.season_pass_active,
        seasonPassExpiry: data.season_pass_expires_at,
      };
    } catch (error) {
      console.error('Error fetching user subscription:', error);
      return null;
    }
  }

  async updateSubscription(subscription: UserSubscription): Promise<void> {
    // TODO: Implement subscription update in Supabase
    throw new Error('Supabase integration not yet implemented. API keys needed.');
  }

  async recordPayment(transaction: PaymentTransaction): Promise<void> {
    try {
      await this.supabase
        .from('payments')
        .insert({
          user_id: transaction.userId,
          grid_id: transaction.gridId,
          amount: transaction.amount,
          currency: transaction.currency,
          stripe_payment_intent_id: transaction.stripePaymentIntentId,
          status: transaction.status,
          payment_type: transaction.type,
        });
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  }

  async getAvailableFeatures(subscription?: UserSubscription, gridId?: string): Promise<FeatureFlags> {
    const hasAccount = !!subscription;

    // Check if user has active season pass
    const hasSeasonPass = Boolean(
      subscription?.seasonPassActive &&
      subscription.seasonPassExpiry &&
      new Date(subscription.seasonPassExpiry) > new Date()
    );

    // Check if specific grid is premium
    let gridIsPremium = false;
    if (gridId) {
      try {
        const { data: grid } = await this.supabase
          .from('grids')
          .select('is_premium')
          .eq('id', gridId)
          .single();

        gridIsPremium = grid?.is_premium || false;
      } catch (error) {
        console.error('Error checking grid premium status:', error);
      }
    }

    const isPremium = hasSeasonPass || gridIsPremium;

    return {
      // Basic features (always free for authenticated users)
      canCreateGrid: true,
      canEditGrid: true,
      canExportPDF: true,
      canExportExcel: true,
      canSaveToCloud: hasAccount,

      // Premium features (require payment)
      canShare: isPremium,
      hasRealTimeUpdates: isPremium,
      hasGameDayMode: isPremium, // Premium feature - tied to grid premium status
      canSendNotifications: isPremium,
      hasAnalytics: isPremium,

      // Season pass only
      canCustomizeBranding: hasSeasonPass,

      // Limits
      maxGridsPerMonth: hasSeasonPass ? Infinity : 10,

      // UI hints
      showUpgradePrompts: !hasSeasonPass && hasAccount,
      currentPlan: hasSeasonPass ? 'season-pass' : (gridIsPremium ? 'per-grid' : 'free'),
    };
  }

  private isGridPremium(subscription: UserSubscription, gridId?: string): boolean {
    if (!gridId) return false;
    
    // Check if this specific grid was paid for
    if (subscription.paymentStatus === 'per-grid-paid' && subscription.paidGridIds) {
      return subscription.paidGridIds.includes(gridId);
    }
    
    // Season pass covers all grids
    return subscription.paymentStatus === 'season-pass' && Boolean(subscription.seasonPassActive);
  }

  // TODO: Implement these methods once Supabase is configured:
  
  // private async createNewGrid(gridState: GridState): Promise<string> {
  //   const { data, error } = await this.supabase.rpc('create_grid_with_code', {
  //     p_title: gridState.title,
  //     p_price_per_box: gridState.pricePerBox,
  //     p_payout_template: gridState.selectedTemplate,
  //     p_payout_rules: gridState.payoutRules,
  //     p_team_home: 'Home Team', // TODO: Add team customization
  //     p_team_away: 'Away Team'
  //   });
  //   
  //   if (error) throw error;
  //   return data[0].grid_id;
  // }

  // private async updateExistingGrid(gridId: string, gridState: GridState): Promise<void> {
  //   // Update grid metadata
  //   const { error: gridError } = await this.supabase
  //     .from('grids')
  //     .update({
  //       title: gridState.title,
  //       price_per_box: gridState.pricePerBox,
  //       payout_template: gridState.selectedTemplate,
  //       payout_rules: gridState.payoutRules,
  //       row_numbers: gridState.rowNumbers,
  //       col_numbers: gridState.colNumbers,
  //       numbers_generated: gridState.numbersGenerated
  //     })
  //     .eq('id', gridId);
  //     
  //   if (gridError) throw gridError;
  //   
  //   // Update boxes with participant names
  //   for (const box of gridState.boxes) {
  //     if (box.name.trim()) {
  //       const { error } = await this.supabase
  //         .from('grid_boxes')
  //         .update({ participant_name: box.name })
  //         .eq('grid_id', gridId)
  //         .eq('box_number', box.row * 10 + box.col);
  //         
  //       if (error) throw error;
  //     }
  //   }
  // }

  static isConfigured(): boolean {
    // Check if Supabase environment variables are set
    return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY);
  }

  /**
   * Transform Supabase grid data back to GridState format
   */
  private transformSupabaseToGridState(supabaseGrid: any): GridState {
    // Convert participants JSON back to boxes array
    const boxes = Array.from({ length: 100 }, (_, i) => {
      const participant = supabaseGrid.participants?.[i.toString()];
      return {
        id: `box-${i}`,
        name: participant?.name || '',
        row: Math.floor(i / 10),
        col: i % 10
      };
    });

    // Extract payment data from participants
    const participantPayments: Array<{ name: string; paid: boolean; paidDate?: string }> = [];
    const uniqueParticipants = new Set<string>();

    if (supabaseGrid.participants) {
      Object.values(supabaseGrid.participants).forEach((participant: any) => {
        if (participant?.name && !uniqueParticipants.has(participant.name)) {
          uniqueParticipants.add(participant.name);
          if (participant.paid !== undefined) {
            participantPayments.push({
              name: participant.name,
              paid: Boolean(participant.paid),
              paidDate: participant.paidDate
            });
          }
        }
      });
    }

    // Transform teams back to separate fields
    const teams = supabaseGrid.teams || {
      home: { name: 'Home Team' },
      away: { name: 'Away Team' }
    };

    // Transform winners back to old format
    const gameWinners = (supabaseGrid.winners || []).map((winner: any) => ({
      quarter: winner.quarter,
      participantName: winner.participant_name,
      boxIndex: winner.box_number,
      homeLastDigit: winner.home_digit,
      awayLastDigit: winner.away_digit,
      amount: winner.amount,
      timestamp: winner.timestamp
    }));

    // Transform scores
    const currentScores = supabaseGrid.current_scores ? [
      {
        homeTeam: supabaseGrid.current_scores.home,
        awayTeam: supabaseGrid.current_scores.away,
        quarter: supabaseGrid.current_scores.period,
        timestamp: supabaseGrid.current_scores.last_updated || new Date().toISOString()
      }
    ] : [];

    return {
      id: supabaseGrid.id,
      boxes,
      rowNumbers: supabaseGrid.row_numbers || [],
      colNumbers: supabaseGrid.col_numbers || [],
      numbersGenerated: Boolean(supabaseGrid.numbers_generated),
      pricePerBox: supabaseGrid.price_per_box || 10,
      payoutRules: supabaseGrid.payout_rules || [],
      selectedTemplate: supabaseGrid.payout_template || 'Balanced',
      title: supabaseGrid.title,
      gameState: supabaseGrid.state || 'draft',
      currentScores,
      gameWinners,
      homeTeamName: teams.home.name,
      awayTeamName: teams.away.name,
      sidePools: supabaseGrid.side_pools || [],
      participantPayments, // Extracted from participants
      wentToOvertime: Boolean(supabaseGrid.went_to_overtime),
      winners: {}, // Legacy field
      // New fields
      ownership: {
        id: supabaseGrid.id,
        ownerId: supabaseGrid.created_by,
        createdAt: supabaseGrid.created_at,
        isPublic: Boolean(supabaseGrid.is_premium && supabaseGrid.share_code),
        joinCode: supabaseGrid.share_code,
        isPremium: Boolean(supabaseGrid.is_premium),
        paymentType: supabaseGrid.payment_type || 'free'
      },
      liveScoringEnabled: Boolean(supabaseGrid.live_scoring_enabled)
    };
  }

  private generateJoinCode(): string {
    // Generate a 6-character alphanumeric code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}