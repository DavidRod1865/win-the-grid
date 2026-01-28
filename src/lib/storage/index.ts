import { StorageProvider, StorageType } from './types';
import { LocalStorageProvider } from './localStorage';
import { SupabaseProvider } from './supabase';
import { UserSubscription } from '@/types';

// Storage factory to determine which provider to use
export class StorageFactory {
  private static instance: StorageProvider | null = null;
  private static currentSubscription: UserSubscription | null = null;

  static getProvider(forceType?: StorageType, subscription?: UserSubscription): StorageProvider {
    // If a specific type is requested, create that provider
    if (forceType === StorageType.LOCAL) {
      return new LocalStorageProvider();
    }
    
    if (forceType === StorageType.SUPABASE) {
      return new SupabaseProvider();
    }

    // Auto-detect based on subscription status
    if (subscription?.tier === 'free' && subscription?.paymentStatus !== 'free') {
      // User has an account - use Supabase even if not premium
      const isSupabaseConfigured = SupabaseProvider.isConfigured();
      if (isSupabaseConfigured) {
        return new SupabaseProvider();
      }
    }

    // Default to localStorage for no account
    return new LocalStorageProvider();
  }

  // Get singleton instance (useful for maintaining state)
  static getInstance(subscription?: UserSubscription): StorageProvider {
    const sub = subscription || null;
    if (!this.instance || sub !== this.currentSubscription) {
      this.instance = this.getProvider(undefined, subscription);
      this.currentSubscription = sub;
    }
    return this.instance;
  }

  // Reset instance (useful when user logs in/out)
  static resetInstance(): void {
    this.instance = null;
    this.currentSubscription = null;
  }

  // Check what features are available
  static getAvailableFeatures(subscription?: UserSubscription, gridId?: string): Promise<import('./types').FeatureFlags> | import('./types').FeatureFlags {
    return this.getInstance(subscription).getAvailableFeatures(subscription, gridId);
  }

  // Set user subscription (call when user state changes)
  static setUserSubscription(subscription: UserSubscription | null): void {
    this.currentSubscription = subscription;
    this.resetInstance(); // Force new provider selection
  }
}

// Utility functions for easier use
export async function saveGrid(gridState: import('@/types').GridState): Promise<string> {
  const provider = StorageFactory.getInstance();
  return provider.saveGrid(gridState);
}

export async function loadGrid(gridId: string): Promise<import('@/types').GridState | null> {
  const provider = StorageFactory.getInstance();
  return provider.loadGrid(gridId);
}

export function getFeatures(subscription?: UserSubscription, gridId?: string): Promise<import('./types').FeatureFlags> | import('./types').FeatureFlags {
  return StorageFactory.getAvailableFeatures(subscription, gridId);
}

// Export types and providers for direct use
export * from './types';
export { LocalStorageProvider } from './localStorage';
export { SupabaseProvider } from './supabase';

// Legacy support - these functions maintain compatibility with existing code
export const saveToStorage = (state: import('@/types').GridState) => {
  // This is async now, but for backward compatibility we'll handle it
  saveGrid(state).catch(console.error);
};

export const loadFromStorage = (): import('@/types').GridState | null => {
  // For backward compatibility, we'll return null and handle async elsewhere
  // TODO: Refactor existing code to use async storage
  console.warn('loadFromStorage is deprecated. Use loadGrid() instead.');
  return null;
};

export const clearStorage = () => {
  LocalStorageProvider.clearStorage();
  // TODO: Add Supabase grid deletion when authenticated
};