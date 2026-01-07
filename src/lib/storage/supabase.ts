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
        is_public: false,
        live_scoring_enabled: false
      })
      .select('id')
      .single();
    
    if (createError) {
      console.error('Migration error:', createError);
      throw new Error(`Failed to create grid: ${createError.message}`);
    }

    const gridId = gridData.id;
    
    // Log successful migration
    try {
      await this.supabase
        .from('grid_activity_log')
        .insert({
          grid_id: gridId,
          user_id: user.id,
          activity_type: 'grid_migrated',
          activity_data: {
            source: 'localStorage',
            participant_count: Object.keys(supabaseData.participants).length,
            had_numbers: supabaseData.numbers_generated,
            had_winners: supabaseData.winners.length > 0
          }
        });
    } catch (logError) {
      // Log migration activity is not critical - don't fail the migration
      console.warn('Failed to log migration:', logError);
    }
    
    return gridId;
  }

  async saveGrid(gridState: GridState): Promise<string> {
    // TODO: Implement Supabase save once client is configured
    throw new Error('Supabase integration not yet implemented. API keys needed.');
    
    // Implementation will be:
    // const { MigrationTransformer } = await import('./migration');
    // const supabaseData = MigrationTransformer.transformGridForSupabase(gridState);
    // 
    // if (gridState.id && gridState.id !== 'local-grid') {
    //   // Update existing grid
    //   const { error } = await this.supabase
    //     .from('grids')
    //     .update(supabaseData)
    //     .eq('id', gridState.id)
    //     .eq('created_by', auth.uid());
    //   
    //   if (error) throw error;
    //   return gridState.id;
    // } else {
    //   // Create new grid
    //   const { data, error } = await this.supabase
    //     .rpc('create_grid_optimized', {
    //       p_title: supabaseData.title,
    //       p_sport_id: supabaseData.sport_id,
    //       p_game_type_id: supabaseData.game_type_id,
    //       p_price_per_box: supabaseData.price_per_box,
    //       p_payout_template: supabaseData.payout_template,
    //       p_payout_rules: supabaseData.payout_rules,
    //       p_teams: supabaseData.teams
    //     });
    //   
    //   if (error) throw error;
    //   
    //   const gridId = data[0].grid_id;
    //   
    //   // Update with participants if any exist
    //   if (Object.keys(supabaseData.participants).length > 0) {
    //     const { error: updateError } = await this.supabase
    //       .from('grids')
    //       .update({ participants: supabaseData.participants })
    //       .eq('id', gridId);
    //     
    //     if (updateError) throw updateError;
    //   }
    //   
    //   return gridId;
    // }
  }

  async loadGrid(gridId: string): Promise<GridState | null> {
    // TODO: Implement Supabase load once client is configured
    throw new Error('Supabase integration not yet implemented. API keys needed.');
    
    // Implementation will be:
    // const { data, error } = await this.supabase
    //   .from('grids')
    //   .select('*')
    //   .eq('id', gridId)
    //   .single();
    // 
    // if (error) {
    //   console.error('Failed to load grid:', error);
    //   return null;
    // }
    // 
    // return this.transformSupabaseToGridState(data);
  }

  async loadUserGrids(): Promise<GridState[]> {
    // TODO: Implement user grids loading
    throw new Error('Supabase integration not yet implemented. API keys needed.');
  }

  async deleteGrid(gridId: string): Promise<void> {
    // TODO: Implement grid deletion
    throw new Error('Supabase integration not yet implemented. API keys needed.');
  }

  async shareGrid(gridId: string): Promise<{ joinCode: string; shareUrl: string }> {
    // TODO: Implement grid sharing once client is configured
    throw new Error('Supabase integration not yet implemented. API keys needed.');
    
    // Implementation will be:
    // const { data, error } = await this.supabase
    //   .from('grids')
    //   .update({ 
    //     join_code: this.generateJoinCode(),
    //     is_public: true,
    //     share_count: this.supabase.raw('share_count + 1')
    //   })
    //   .eq('id', gridId)
    //   .eq('created_by', auth.uid())
    //   .select('join_code')
    //   .single();
    // 
    // if (error) throw error;
    // 
    // const shareUrl = `${window.location.origin}/share/${data.join_code}`;
    // return { joinCode: data.join_code, shareUrl };
  }

  async getGridByJoinCode(joinCode: string): Promise<GridState | null> {
    // TODO: Implement join code lookup
    throw new Error('Supabase integration not yet implemented. API keys needed.');
  }

  async subscribeToGridUpdates(gridId: string, callback: (grid: GridState) => void): Promise<() => void> {
    // TODO: Implement real-time subscriptions
    throw new Error('Supabase integration not yet implemented. API keys needed.');
  }

  async getUserSubscription(): Promise<UserSubscription | null> {
    // TODO: Implement subscription lookup from Supabase
    throw new Error('Supabase integration not yet implemented. API keys needed.');
  }

  async updateSubscription(subscription: UserSubscription): Promise<void> {
    // TODO: Implement subscription update in Supabase
    throw new Error('Supabase integration not yet implemented. API keys needed.');
  }

  async recordPayment(transaction: PaymentTransaction): Promise<void> {
    // TODO: Implement payment recording in Supabase
    throw new Error('Supabase integration not yet implemented. API keys needed.');
  }

  getAvailableFeatures(subscription?: UserSubscription, gridId?: string): FeatureFlags {
    // Supabase provider = has account, so all features available (free, but requires account)
    // If no subscription provided, user doesn't have account yet
    const hasAccount = !!subscription;
    
    return {
      canCreateGrid: true,
      canEditGrid: true,
      canExportPDF: true,
      canExportExcel: true,        // Free
      canSaveToCloud: true,
      canShare: hasAccount,        // Free, but requires account
      hasGameDayMode: true,        // Free
      hasRealTimeUpdates: true,    // Free
      hasLiveScoring: true,        // Free
      canCreateMultipleGrids: true, // Free
      
      showUpgradePrompts: false,   // No upgrade prompts needed
      requiresPayment: false       // No payments required
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
      wentToOvertime: Boolean(supabaseGrid.went_to_overtime),
      winners: {}, // Legacy field
      // New fields
      ownership: {
        id: supabaseGrid.id,
        ownerId: supabaseGrid.created_by,
        createdAt: supabaseGrid.created_at,
        isPublic: Boolean(supabaseGrid.is_public),
        joinCode: supabaseGrid.join_code,
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