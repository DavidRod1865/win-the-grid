// Data transformation utilities for localStorage to Supabase migration
import { GridState } from '@/types';

export interface MigrationData {
  hasData: boolean;
  gridState: GridState | null;
  metadata: {
    participantCount: number;
    numbersGenerated: boolean;
    lastModified: string | null;
    dataSize: number;
    migrationEstimate: string;
  };
}

export interface SupabaseGridData {
  title: string;
  sport_id: string;
  game_type_id: string;
  price_per_box: number;
  payout_template: string;
  payout_rules: any[];
  teams: {
    home: { name: string; abbreviation: string; logo_url?: string };
    away: { name: string; abbreviation: string; logo_url?: string };
  };
  participants: Record<string, { name: string; filled_at: string; email?: string }>;
  row_numbers: number[] | null;
  col_numbers: number[] | null;
  numbers_generated: boolean;
  winners: any[];
  current_scores: {
    home: number;
    away: number;
    period: string;
    last_updated?: string;
  };
  side_pools: any[];
  state: string;
  is_premium: boolean;
  payment_type: string;
}

export class MigrationTransformer {
  /**
   * Transform localStorage GridState to Supabase-compatible format
   */
  static transformGridForSupabase(gridState: GridState): SupabaseGridData {
    // Convert boxes array to participants JSON object
    const participants: Record<string, { name: string; filled_at: string; email?: string }> = {};
    
    if (gridState.boxes) {
      gridState.boxes.forEach((box, index) => {
        if (box.name && box.name.trim()) {
          participants[index.toString()] = {
            name: box.name.trim(),
            filled_at: new Date().toISOString(), // localStorage doesn't have timestamps
            email: undefined // localStorage doesn't store emails
          };
        }
      });
    }

    // Transform team names to Supabase format
    const teams = {
      home: {
        name: gridState.homeTeamName || 'Home Team',
        abbreviation: this.generateAbbreviation(gridState.homeTeamName || 'Home Team')
      },
      away: {
        name: gridState.awayTeamName || 'Away Team',  
        abbreviation: this.generateAbbreviation(gridState.awayTeamName || 'Away Team')
      }
    };

    // Transform winners from old format to new JSON array format
    const winners: any[] = [];
    if (gridState.gameWinners && Array.isArray(gridState.gameWinners)) {
      winners.push(...gridState.gameWinners.map(winner => ({
        quarter: winner.quarter,
        participant_name: winner.participantName,
        box_number: winner.boxIndex,
        home_digit: winner.homeLastDigit,
        away_digit: winner.awayLastDigit,
        amount: winner.amount,
        timestamp: winner.timestamp,
        home_score: 0, // localStorage doesn't store individual scores
        away_score: 0
      })));
    }

    // Transform current scores
    const currentScores = gridState.currentScores && gridState.currentScores.length > 0 
      ? {
          home: gridState.currentScores[gridState.currentScores.length - 1]?.homeTeam || 0,
          away: gridState.currentScores[gridState.currentScores.length - 1]?.awayTeam || 0,
          period: gridState.currentScores[gridState.currentScores.length - 1]?.quarter || 'Pre-Game'
        }
      : {
          home: 0,
          away: 0,
          period: 'Pre-Game'
        };

    return {
      title: gridState.title || 'Super Bowl LX',
      sport_id: 'football', // Default to football for existing grids
      game_type_id: 'squares', // Default to squares
      price_per_box: gridState.pricePerBox || 10,
      payout_template: gridState.selectedTemplate || 'Balanced',
      payout_rules: gridState.payoutRules || [],
      teams,
      participants,
      row_numbers: gridState.numbersGenerated ? (gridState.rowNumbers || null) : null,
      col_numbers: gridState.numbersGenerated ? (gridState.colNumbers || null) : null,
      numbers_generated: Boolean(gridState.numbersGenerated),
      winners,
      current_scores: currentScores,
      side_pools: gridState.sidePools || [],
      state: this.mapGameState(gridState.gameState),
      is_premium: false, // Migrated grids start as free
      payment_type: 'free'
    };
  }

  /**
   * Generate team abbreviation from team name
   */
  private static generateAbbreviation(teamName: string): string {
    if (!teamName || typeof teamName !== 'string') {
      return 'TEAM';
    }

    const words = teamName.trim().split(/\s+/);
    
    if (words.length === 1) {
      // Single word: take first 4 characters
      return words[0].substring(0, 4).toUpperCase();
    } else if (words.length === 2) {
      // Two words: first 2 characters of each
      return (words[0].substring(0, 2) + words[1].substring(0, 2)).toUpperCase();
    } else {
      // Multiple words: first character of each, up to 4
      return words
        .slice(0, 4)
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase();
    }
  }

  /**
   * Map old game state to new state values
   */
  private static mapGameState(gameState?: string): string {
    const stateMap: Record<string, string> = {
      'draft': 'draft',
      'ready': 'ready', 
      'live': 'live',
      'completed': 'completed',
      'game': 'live', // Legacy state mapping
      'finished': 'completed' // Legacy state mapping
    };

    return stateMap[gameState || 'draft'] || 'draft';
  }

  /**
   * Validate migration data before sending to Supabase
   */
  static validateMigrationData(data: SupabaseGridData): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!data.title || data.title.trim().length === 0) {
      errors.push('Grid title is required');
    }

    if (data.price_per_box < 0) {
      errors.push('Price per box must be non-negative');
    }

    if (data.price_per_box > 1000) {
      warnings.push('Price per box is very high ($' + data.price_per_box + ')');
    }

    // Participant validation
    const participantCount = Object.keys(data.participants).length;
    if (participantCount > 100) {
      errors.push('Too many participants (max 100)');
    }

    // Numbers validation
    if (data.numbers_generated) {
      if (!data.row_numbers || data.row_numbers.length !== 10) {
        errors.push('Invalid row numbers array');
      }
      
      if (!data.col_numbers || data.col_numbers.length !== 10) {
        errors.push('Invalid column numbers array');
      }

      // Check for duplicate numbers
      if (data.row_numbers && new Set(data.row_numbers).size !== 10) {
        errors.push('Row numbers must be unique');
      }

      if (data.col_numbers && new Set(data.col_numbers).size !== 10) {
        errors.push('Column numbers must be unique');
      }
    }

    // Payout rules validation
    if (!Array.isArray(data.payout_rules) || data.payout_rules.length === 0) {
      warnings.push('No payout rules defined');
    } else {
      const totalPercentage = data.payout_rules.reduce((sum, rule) => 
        sum + (rule.percentage || 0), 0
      );
      
      if (Math.abs(totalPercentage - 100) > 0.01) {
        warnings.push(`Payout percentages don't add up to 100% (${totalPercentage}%)`);
      }
    }

    // Winners validation
    if (data.winners.length > 0) {
      for (const winner of data.winners) {
        if (!winner.participant_name || !winner.quarter) {
          errors.push('Invalid winner data found');
          break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Estimate migration complexity and time
   */
  static estimateMigration(gridState: GridState): {
    complexity: 'simple' | 'moderate' | 'complex';
    estimatedTime: string;
    details: string[];
  } {
    const details: string[] = [];
    let complexityScore = 0;

    // Count participants
    const participantCount = gridState.boxes?.filter(box => box.name?.trim()).length || 0;
    details.push(`${participantCount} participants`);
    
    if (participantCount > 50) complexityScore += 2;
    else if (participantCount > 10) complexityScore += 1;

    // Check numbers generation
    if (gridState.numbersGenerated) {
      details.push('Numbers generated');
      complexityScore += 1;
    }

    // Check winners
    const winnerCount = gridState.gameWinners?.length || 0;
    if (winnerCount > 0) {
      details.push(`${winnerCount} winners recorded`);
      complexityScore += winnerCount;
    }

    // Check side pools
    const sidePoolCount = gridState.sidePools?.filter(pool => pool.enabled).length || 0;
    if (sidePoolCount > 0) {
      details.push(`${sidePoolCount} side pools`);
      complexityScore += sidePoolCount;
    }

    // Check custom settings
    if (gridState.selectedTemplate !== 'Balanced') {
      details.push('Custom payout template');
      complexityScore += 1;
    }

    // Determine complexity
    let complexity: 'simple' | 'moderate' | 'complex';
    let estimatedTime: string;

    if (complexityScore <= 2) {
      complexity = 'simple';
      estimatedTime = '< 5 seconds';
    } else if (complexityScore <= 5) {
      complexity = 'moderate';
      estimatedTime = '5-10 seconds';
    } else {
      complexity = 'complex';
      estimatedTime = '10-15 seconds';
    }

    return { complexity, estimatedTime, details };
  }

  /**
   * Create a human-readable migration summary
   */
  static createMigrationSummary(gridState: GridState): {
    title: string;
    summary: string;
    details: string[];
    preservedData: string[];
  } {
    const participantCount = gridState.boxes?.filter(box => box.name?.trim()).length || 0;
    const winnerCount = gridState.gameWinners?.length || 0;
    const hasNumbers = Boolean(gridState.numbersGenerated);

    const details: string[] = [];
    const preservedData: string[] = [];

    // Build summary details
    if (participantCount > 0) {
      details.push(`${participantCount} participant${participantCount === 1 ? '' : 's'}`);
      preservedData.push('Participant names and positions');
    }

    if (hasNumbers) {
      details.push('Generated numbers');
      preservedData.push('Grid numbers for scoring');
    }

    if (winnerCount > 0) {
      details.push(`${winnerCount} winner${winnerCount === 1 ? '' : 's'} recorded`);
      preservedData.push('Winner history and payouts');
    }

    if (gridState.pricePerBox && gridState.pricePerBox !== 10) {
      details.push(`$${gridState.pricePerBox} per box`);
      preservedData.push('Pricing configuration');
    }

    if (gridState.selectedTemplate && gridState.selectedTemplate !== 'Balanced') {
      details.push(`${gridState.selectedTemplate} payout template`);
      preservedData.push('Payout structure');
    }

    const title = gridState.title || 'Super Bowl LX';
    const summary = details.length > 0 
      ? `Your grid "${title}" will be saved to your account with ${details.join(', ')}.`
      : `Your empty grid "${title}" will be saved to your account.`;

    if (preservedData.length === 0) {
      preservedData.push('Grid setup and configuration');
    }

    return {
      title,
      summary,
      details,
      preservedData
    };
  }
}