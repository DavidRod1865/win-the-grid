export interface SquareBox {
  id: string;
  name: string;
  row: number;
  col: number;
}

export interface PayoutRule {
  quarter: string;
  percentage: number;
  amount?: number;
}

export interface PayoutTemplate {
  name: string;
  description: string;
  bestFor: string;
  rules: PayoutRule[];
  specialLogic?: 'no-repeat' | 'standard';
}

export type GameState = 'draft' | 'ready' | 'live' | 'completed';

export type SubscriptionTier = 'free' | 'paid';
export type PaymentStatus = 'free' | 'per-grid-paid' | 'season-pass';
export type GridAccessLevel = 'owner' | 'view-only';

export interface GameScore {
  homeTeam: number;
  awayTeam: number;
  quarter: string;
  timestamp: string;
}

export interface Winner {
  quarter: string;
  homeLastDigit: number;
  awayLastDigit: number;
  boxIndex: number;
  participantName: string;
  amount: number;
  timestamp: string;
}

export interface SidePool {
  id: string;
  name: string;
  enabled: boolean;
  percentage: number;
  description: string;
}

export interface ParticipantPayment {
  name: string;
  paid: boolean;
  paidDate?: string; // ISO date string
  amount?: number;
  paymentMethod?: string;
}

export interface UserSubscription {
  userId?: string;
  tier: SubscriptionTier;
  paymentStatus: PaymentStatus;
  seasonPassActive?: boolean;
  seasonPassExpiry?: string; // ISO date string
  paidGridIds?: string[]; // List of grid IDs with per-grid payment
}

export interface GridOwnership {
  id: string; // Unique grid ID
  ownerId?: string; // User ID of the owner
  createdAt: string; // ISO date string
  isPublic: boolean; // Whether grid can be shared
  joinCode?: string; // Code for view-only access
  isPremium: boolean; // Whether this grid has premium features enabled
  paymentType?: 'per-grid' | 'season-pass' | 'free'; // How premium was unlocked
}

export interface GridState {
  id?: string; // Unique identifier for the grid
  boxes: SquareBox[];
  rowNumbers: number[];
  colNumbers: number[];
  numbersGenerated: boolean;
  pricePerBox: number;
  payoutRules: PayoutRule[];
  selectedTemplate: string;
  winners?: { [quarter: string]: string }; // For no-repeat logic
  title?: string; // Custom title for the squares game
  gameState?: GameState; // Current state of the game
  currentScores?: GameScore[]; // Score history during the game
  gameWinners?: Winner[]; // Winners for each quarter that has been scored
  homeTeamName?: string; // Custom home team name (fallback if no game selected)
  awayTeamName?: string; // Custom away team name (fallback if no game selected)
  sidePools?: SidePool[]; // Side pool configurations
  wentToOvertime?: boolean; // Track if game went to overtime
  sidePoolsEnabled?: boolean; // Whether side pools feature is enabled
  participantPayments?: ParticipantPayment[]; // Payment tracking for participants

  // New ownership and access control fields
  ownership?: GridOwnership;
  accessLevel?: GridAccessLevel; // User's access level to this grid
  isViewOnly?: boolean; // Whether user is viewing via join code
  liveScoringEnabled?: boolean; // Whether live scoring is active (premium feature)

  // Sports API integration fields
  gameId?: string;              // References games.id (API-Football game ID)
  homeTeamLogo?: string;        // Team logo URL
  awayTeamLogo?: string;        // Team logo URL
}

export interface ExportOptions {
  includeNames: boolean;
  includeNumbers: boolean;
  includePayouts: boolean;
  colorMode: 'color' | 'blackwhite';
}

export interface LiveScoreData {
  gameId: string;
  homeTeam: {
    name: string;
    score: number;
    abbreviation: string;
  };
  awayTeam: {
    name: string;
    score: number;
    abbreviation: string;
  };
  quarter: string;
  timeRemaining?: string;
  gameStatus: 'scheduled' | 'live' | 'final' | 'postponed';
  lastUpdated: string; // ISO date string
}

export interface PaymentTransaction {
  id: string;
  gridId?: string; // For per-grid payments
  userId?: string;
  type: 'per-grid' | 'season-pass';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod?: string;
  transactionDate: string; // ISO date string
  stripePaymentIntentId?: string;
}

export interface Game {
  id: string;                      // API-Football game ID
  league: string;                  // 'nfl', 'nba', etc.
  season: string;                  // '2024'
  scheduledTime: string;           // ISO datetime
  status: string;                  // 'NS', 'LIVE', 'FT'

  // Teams
  homeTeam: {
    name: string;
    logo?: string;
    abbreviation?: string;
  };
  awayTeam: {
    name: string;
    logo?: string;
    abbreviation?: string;
  };

  // Scores (null if game hasn't started)
  homeScore: number;
  awayScore: number;
  currentPeriod?: string;          // 'Q1', 'Q2', 'Half', etc.

  // Metadata
  lastScoreUpdate?: string;
}