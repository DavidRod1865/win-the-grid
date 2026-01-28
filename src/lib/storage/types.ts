import { GridState, UserSubscription, PaymentTransaction } from '@/types';

export interface StorageProvider {
  // Grid management
  saveGrid(gridState: GridState): Promise<string>; // Returns grid ID
  loadGrid(gridId: string): Promise<GridState | null>;
  loadUserGrids?(): Promise<GridState[]>; // For account holders
  deleteGrid?(gridId: string): Promise<void>; // For account holders
  
  // Sharing features (premium only)
  shareGrid?(gridId: string): Promise<{ joinCode: string; shareUrl: string }>;
  getGridByJoinCode?(joinCode: string): Promise<GridState | null>;
  
  // Real-time features (premium only)
  subscribeToGridUpdates?(gridId: string, callback: (grid: GridState) => void): Promise<() => void>;
  
  // Subscription and payment management
  getUserSubscription?(): Promise<UserSubscription | null>;
  updateSubscription?(subscription: UserSubscription): Promise<void>;
  recordPayment?(transaction: PaymentTransaction): Promise<void>;
  
  // Feature availability (now subscription-aware)
  getAvailableFeatures(subscription?: UserSubscription, gridId?: string): Promise<FeatureFlags> | FeatureFlags;
}

export interface FeatureFlags {
  // Basic features (always free)
  canCreateGrid: boolean;
  canEditGrid: boolean;
  canExportPDF: boolean;
  canExportExcel: boolean;
  canSaveToCloud: boolean; // Account vs localStorage

  // Premium features (require payment - unlocked with sharing)
  canShare: boolean;
  hasRealTimeUpdates: boolean;
  hasGameDayMode: boolean; // Live scoring - premium feature
  canSendNotifications: boolean;
  hasAnalytics: boolean;

  // Season pass only
  canCustomizeBranding: boolean;

  // Limits
  maxGridsPerMonth: number;

  // UI hints
  showUpgradePrompts: boolean;
  currentPlan: 'free' | 'per-grid' | 'season-pass';
}

export enum StorageType {
  LOCAL = 'local',
  SUPABASE = 'supabase'
}