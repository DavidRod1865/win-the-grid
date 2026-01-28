import { GridState, GameState, UserSubscription, PaymentTransaction } from '@/types';
import { StorageProvider, FeatureFlags, StorageType } from './types';

const STORAGE_KEY = 'squares-calculator-state';
const GRIDS_LIST_KEY = 'squares-calculator-grids-list';

export class LocalStorageProvider implements StorageProvider {
  async saveGrid(gridState: GridState): Promise<string> {
    if (typeof window === 'undefined') {
      throw new Error('localStorage not available on server');
    }

    try {
      // Generate or use existing grid ID
      const gridId = gridState.id || `grid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const gridWithId = { ...gridState, id: gridId };
      
      // Save the grid with its ID as the key
      const gridKey = `${STORAGE_KEY}-${gridId}`;
      localStorage.setItem(gridKey, JSON.stringify(gridWithId));
      
      // Update the grids list
      const gridsList = this.getGridsList();
      if (!gridsList.includes(gridId)) {
        gridsList.push(gridId);
        localStorage.setItem(GRIDS_LIST_KEY, JSON.stringify(gridsList));
      }
      
      // For backward compatibility, also save to the old key if this is the first grid
      if (gridsList.length === 1) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(gridWithId));
      }
      
      return gridId;
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      throw new Error('Failed to save grid locally');
    }
  }

  async loadGrid(gridId: string): Promise<GridState | null> {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      // Try loading from the new format first
      const gridKey = `${STORAGE_KEY}-${gridId}`;
      const saved = localStorage.getItem(gridKey);
      if (saved) {
        return JSON.parse(saved);
      }
      
      // Fallback to legacy format for backward compatibility
      if (gridId === 'local-grid') {
        const legacySaved = localStorage.getItem(STORAGE_KEY);
        if (legacySaved) {
          const parsed = JSON.parse(legacySaved);
          // Migrate to new format
          if (parsed && !parsed.id) {
            parsed.id = 'local-grid';
            await this.saveGrid(parsed);
          }
          return parsed;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return null;
    }
  }

  async loadUserGrids(): Promise<GridState[]> {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const gridsList = this.getGridsList();
      const grids: GridState[] = [];
      
      for (const gridId of gridsList) {
        const grid = await this.loadGrid(gridId);
        if (grid) {
          grids.push(grid);
        }
      }
      
      // If no grids found in new format, check legacy format
      if (grids.length === 0) {
        const legacySaved = localStorage.getItem(STORAGE_KEY);
        if (legacySaved) {
          try {
            const parsed = JSON.parse(legacySaved);
            if (parsed) {
              if (!parsed.id) {
                parsed.id = 'local-grid';
              }
              grids.push(parsed);
              // Migrate to new format
              await this.saveGrid(parsed);
            }
          } catch (e) {
            console.error('Failed to parse legacy grid:', e);
          }
        }
      }
      
      // Sort by title or creation date (newest first)
      return grids.sort((a, b) => {
        const titleA = a.title || '';
        const titleB = b.title || '';
        return titleA.localeCompare(titleB);
      });
    } catch (error) {
      console.error('Failed to load user grids:', error);
      return [];
    }
  }

  private getGridsList(): string[] {
    if (typeof window === 'undefined') {
      return [];
    }
    
    try {
      const saved = localStorage.getItem(GRIDS_LIST_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Failed to load grids list:', error);
      return [];
    }
  }

  // Account-only methods that throw errors for localStorage users
  async shareGrid(gridId: string): Promise<{ joinCode: string; shareUrl: string }> {
    throw new Error('Grid sharing requires an account. Sign up to share your grid!');
  }

  async getGridByJoinCode(joinCode: string): Promise<GridState | null> {
    // Look up the grid ID from the join code
    if (typeof window === 'undefined') return null;
    
    // Search through localStorage for the matching join code
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('grid_join_code_')) {
        const storedCode = localStorage.getItem(key);
        if (storedCode === joinCode.toUpperCase()) {
          const gridId = key.replace('grid_join_code_', '');
          return this.loadGrid(gridId);
        }
      }
    }
    
    return null;
  }

  async subscribeToGridUpdates(gridId: string, callback: (grid: GridState) => void): Promise<() => void> {
    throw new Error('Real-time updates require an account. Sign up for live collaboration!');
  }

  // Subscription management (not available for localStorage)
  async getUserSubscription(): Promise<UserSubscription | null> {
    return {
      tier: 'free',
      paymentStatus: 'free'
    };
  }

  async updateSubscription(_subscription: UserSubscription): Promise<void> {
    throw new Error('Subscription management requires an account. Sign up to manage subscriptions!');
  }

  async recordPayment(_transaction: PaymentTransaction): Promise<void> {
    throw new Error('Payment recording requires an account. Sign up to track payments!');
  }

  getAvailableFeatures(_subscription?: UserSubscription, _gridId?: string): FeatureFlags {
    // localStorage = no account, so sharing requires signup and payment
    return {
      // Basic features (always free)
      canCreateGrid: true,
      canEditGrid: true,
      canExportPDF: true,
      canExportExcel: true,
      canSaveToCloud: false, // localStorage only

      // Premium features (require account + payment)
      canShare: false, // Requires account and payment
      hasRealTimeUpdates: false,
      canSendNotifications: false,
      hasAnalytics: false,

      // Season pass only
      canCustomizeBranding: false,

      // Limits
      maxGridsPerMonth: Infinity, // No limit for local storage

      // UI hints
      showUpgradePrompts: false, // Don't show until they have an account
      currentPlan: 'free',
    };
  }

  // Helper methods for legacy support
  static clearStorage(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  static async clearAfterMigration(): Promise<void> {
    if (typeof window !== 'undefined') {
      // Add a small delay to ensure migration is complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Clear both old and new format localStorage keys
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(`${STORAGE_KEY}-local-grid`);
      localStorage.removeItem(GRIDS_LIST_KEY);
      
      // Store a flag that migration happened
      localStorage.setItem('squares-migration-completed', new Date().toISOString());
    }
  }

  static wasMigrated(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('squares-migration-completed') !== null;
  }

  static hasLocalGrid(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY) !== null;
  }

  static hasSignificantData(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Check both old format and new format with grid IDs
    let saved = localStorage.getItem(STORAGE_KEY);
    
    // If no data in old format, check for grid with 'local-grid' ID
    if (!saved) {
      saved = localStorage.getItem(`${STORAGE_KEY}-local-grid`);
    }
    
    if (!saved) return false;

    try {
      const parsed = JSON.parse(saved);
      const participantCount = parsed.boxes?.filter((box: any) => box?.name?.trim()).length || 0;
      
      // Consider data "significant" if there are participants or numbers generated
      return participantCount > 0 || parsed.numbersGenerated;
    } catch {
      return false;
    }
  }

  static async migrateToSupabase(): Promise<GridState | null> {
    if (typeof window === 'undefined') return null;
    
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    try {
      const parsed = JSON.parse(saved);
      return this.sanitizeGridForMigration(parsed);
    } catch {
      return null;
    }
  }

  // Enhanced migration with metadata and validation
  static async getMigrationData(): Promise<{
    hasData: boolean;
    gridState: GridState | null;
    metadata: {
      participantCount: number;
      numbersGenerated: boolean;
      lastModified: string | null;
      dataSize: number;
    };
  }> {
    if (typeof window === 'undefined') {
      return {
        hasData: false,
        gridState: null,
        metadata: { participantCount: 0, numbersGenerated: false, lastModified: null, dataSize: 0 }
      };
    }

    // Check both old format and new format with grid IDs
    let saved = localStorage.getItem(STORAGE_KEY);
    
    // If no data in old format, check for grid with 'local-grid' ID
    if (!saved) {
      saved = localStorage.getItem(`${STORAGE_KEY}-local-grid`);
    }
    
    if (!saved) {
      return {
        hasData: false,
        gridState: null,
        metadata: { participantCount: 0, numbersGenerated: false, lastModified: null, dataSize: 0 }
      };
    }

    try {
      const parsed = JSON.parse(saved);
      const sanitized = this.sanitizeGridForMigration(parsed);
      
      if (!sanitized) {
        return {
          hasData: false,
          gridState: null,
          metadata: { participantCount: 0, numbersGenerated: false, lastModified: null, dataSize: 0 }
        };
      }

      const participantCount = sanitized.boxes?.filter(box => box.name?.trim()).length || 0;
      
      return {
        hasData: true,
        gridState: sanitized,
        metadata: {
          participantCount,
          numbersGenerated: sanitized.numbersGenerated || false,
          lastModified: new Date().toISOString(), // localStorage doesn't store timestamps
          dataSize: saved.length
        }
      };
    } catch (error) {
      console.error('Failed to parse migration data:', error);
      return {
        hasData: false,
        gridState: null,
        metadata: { participantCount: 0, numbersGenerated: false, lastModified: null, dataSize: 0 }
      };
    }
  }

  // Sanitize and validate grid data for cloud migration
  private static sanitizeGridForMigration(rawData: any): GridState | null {
    if (!rawData || typeof rawData !== 'object') {
      return null;
    }

    try {
      // Ensure we have basic required fields
      const sanitized: GridState = {
        id: 'local-grid', // Will be replaced during migration
        boxes: this.sanitizeBoxes(rawData.boxes),
        rowNumbers: Array.isArray(rawData.rowNumbers) ? rawData.rowNumbers : [],
        colNumbers: Array.isArray(rawData.colNumbers) ? rawData.colNumbers : [],
        numbersGenerated: Boolean(rawData.numbersGenerated),
        pricePerBox: this.sanitizePrice(rawData.pricePerBox),
        payoutRules: Array.isArray(rawData.payoutRules) ? rawData.payoutRules : [],
        selectedTemplate: typeof rawData.selectedTemplate === 'string' ? rawData.selectedTemplate : 'Balanced',
        title: this.sanitizeTitle(rawData.title),
        gameState: this.sanitizeGameState(rawData.gameState),
        homeTeamName: typeof rawData.homeTeamName === 'string' ? rawData.homeTeamName : 'Home Team',
        awayTeamName: typeof rawData.awayTeamName === 'string' ? rawData.awayTeamName : 'Away Team',
        winners: rawData.winners || {},
        currentScores: Array.isArray(rawData.currentScores) ? rawData.currentScores : [],
        gameWinners: Array.isArray(rawData.gameWinners) ? rawData.gameWinners : [],
        sidePools: Array.isArray(rawData.sidePools) ? rawData.sidePools : [],
        participantPayments: Array.isArray(rawData.participantPayments) ? rawData.participantPayments : []
      };

      return sanitized;
    } catch (error) {
      console.error('Failed to sanitize grid data:', error);
      return null;
    }
  }

  private static sanitizeBoxes(boxes: any): Array<{ id: string; name: string; row: number; col: number }> {
    if (!Array.isArray(boxes)) {
      // Generate empty boxes if none exist
      return Array.from({ length: 100 }, (_, i) => ({
        id: `box-${i}`,
        name: '',
        row: Math.floor(i / 10),
        col: i % 10
      }));
    }

    return boxes.map((box, index) => ({
      id: typeof box?.id === 'string' ? box.id : `box-${index}`,
      name: typeof box?.name === 'string' ? box.name.trim() : '',
      row: typeof box?.row === 'number' ? box.row : Math.floor(index / 10),
      col: typeof box?.col === 'number' ? box.col : index % 10
    }));
  }

  private static sanitizePrice(price: any): number {
    const parsed = parseFloat(price);
    return isNaN(parsed) || parsed < 0 ? 10 : Math.min(parsed, 1000); // Cap at $1000 per box
  }

  private static sanitizeTitle(title: any): string {
    if (typeof title === 'string' && title.trim().length > 0) {
      return title.trim().slice(0, 100); // Limit title length
    }
    return 'Super Bowl LX';
  }

  private static sanitizeGameState(state: any): GameState {
    const validStates: GameState[] = ['draft', 'ready', 'live', 'completed'];
    return validStates.includes(state) ? state : 'draft';
  }

  static generateRandomNumbers(): number[] {
    const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    return numbers;
  }
}