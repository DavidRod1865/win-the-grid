import { posthog } from './posthog';
import { GridState, GameState } from '@/types';

/**
 * Analytics tracking utility for Win The Grid
 * All events are sent to PostHog for funnel analysis and product insights
 */

// ============================================================
// GRID CREATION & MANAGEMENT
// ============================================================

export const analytics = {
  /**
   * Track when a user creates a new grid
   */
  gridCreated: (gridId: string, isAuthenticated: boolean) => {
    posthog.capture('grid_created', {
      grid_id: gridId,
      is_authenticated: isAuthenticated,
      $set: {
        total_grids_created: posthog.get_property('total_grids_created') || 0 + 1,
      },
    });
  },

  /**
   * Track when a grid is completely filled with participants
   */
  gridFilled: (gridId: string, participantCount: number, timeToFill?: number) => {
    posthog.capture('grid_filled', {
      grid_id: gridId,
      participant_count: participantCount,
      time_to_fill_seconds: timeToFill,
    });
  },

  /**
   * Track when numbers are generated for a grid (critical milestone)
   */
  numbersGenerated: (gridId: string, participantCount: number) => {
    posthog.capture('numbers_generated', {
      grid_id: gridId,
      participant_count: participantCount,
    });
  },

  /**
   * Track grid state transitions
   */
  gridStateChanged: (gridId: string, fromState: GameState, toState: GameState) => {
    posthog.capture('grid_state_changed', {
      grid_id: gridId,
      from_state: fromState,
      to_state: toState,
    });
  },

  // ============================================================
  // SHARING & CONVERSION (Critical funnel)
  // ============================================================

  /**
   * Track when user clicks the share button
   * This is the critical conversion point - measures intent to upgrade
   */
  shareButtonClicked: (gridId: string, isAuthenticated: boolean, isPremium?: boolean) => {
    posthog.capture('share_button_clicked', {
      grid_id: gridId,
      is_authenticated: isAuthenticated,
      is_premium: isPremium || false,
      $set: {
        last_share_attempt: new Date().toISOString(),
      },
    });
  },

  /**
   * Track when unlock modal is shown (paywall encounter)
   */
  unlockModalShown: (gridId: string, participantCount: number, pricePerBox: number) => {
    const potentialRevenue = participantCount * pricePerBox;
    posthog.capture('unlock_modal_shown', {
      grid_id: gridId,
      participant_count: participantCount,
      price_per_box: pricePerBox,
      potential_grid_revenue: potentialRevenue,
    });
  },

  /**
   * Track when user dismisses the unlock modal (conversion failure)
   */
  unlockModalDismissed: (gridId: string, reason?: 'close' | 'backdrop' | 'cancel') => {
    posthog.capture('unlock_modal_dismissed', {
      grid_id: gridId,
      dismiss_reason: reason,
    });
  },

  // ============================================================
  // PAYMENT FLOW (Revenue funnel)
  // ============================================================

  /**
   * Track when checkout process is initiated
   */
  checkoutInitiated: (gridId: string, productType: 'per-grid' | 'season-pass', amount: number) => {
    posthog.capture('checkout_initiated', {
      grid_id: gridId,
      product_type: productType,
      amount: amount,
      currency: 'USD',
    });
  },

  /**
   * Track successful payment completion
   */
  paymentCompleted: (
    gridId: string,
    productType: 'per-grid' | 'season-pass',
    amount: number,
    paymentIntentId: string
  ) => {
    posthog.capture('payment_completed', {
      grid_id: gridId,
      product_type: productType,
      amount: amount,
      currency: 'USD',
      payment_intent_id: paymentIntentId,
      $set: {
        is_paying_customer: true,
        total_revenue: (posthog.get_property('total_revenue') || 0) + amount,
        last_payment_date: new Date().toISOString(),
      },
    });

    // Also track as revenue event for PostHog
    posthog.capture('$revenue', {
      revenue: amount,
      product_type: productType,
    });
  },

  /**
   * Track payment failures
   */
  paymentFailed: (gridId: string, productType: 'per-grid' | 'season-pass', reason?: string) => {
    posthog.capture('payment_failed', {
      grid_id: gridId,
      product_type: productType,
      failure_reason: reason,
    });
  },

  /**
   * Track when user is redirected to Stripe Checkout
   */
  checkoutRedirected: (gridId: string, sessionId: string) => {
    posthog.capture('checkout_redirected', {
      grid_id: gridId,
      checkout_session_id: sessionId,
    });
  },

  // ============================================================
  // SHARING & VIRALITY
  // ============================================================

  /**
   * Track when a grid is successfully shared (premium feature used)
   */
  gridShared: (gridId: string, shareCode: string, shareMethod?: 'link' | 'qr' | 'text' | 'email') => {
    posthog.capture('grid_shared', {
      grid_id: gridId,
      share_code: shareCode,
      share_method: shareMethod,
      $set: {
        total_grids_shared: (posthog.get_property('total_grids_shared') || 0) + 1,
      },
    });
  },

  /**
   * Track when someone views a shared grid
   */
  gridViewed: (gridId: string, isOwner: boolean, shareCode?: string) => {
    posthog.capture('grid_viewed', {
      grid_id: gridId,
      is_owner: isOwner,
      share_code: shareCode,
    });
  },

  /**
   * Track when someone joins via a share code
   */
  joinCodeUsed: (gridId: string, shareCode: string) => {
    posthog.capture('join_code_used', {
      grid_id: gridId,
      share_code: shareCode,
    });
  },

  /**
   * Track share link copy to clipboard
   */
  shareLinkCopied: (gridId: string, shareCode: string) => {
    posthog.capture('share_link_copied', {
      grid_id: gridId,
      share_code: shareCode,
    });
  },

  // ============================================================
  // GAME DAY & WINNERS
  // ============================================================

  /**
   * Track when game goes live
   */
  gameDayStarted: (gridId: string) => {
    posthog.capture('game_day_started', {
      grid_id: gridId,
    });
  },

  /**
   * Track when a winner is announced
   */
  winnerAnnounced: (gridId: string, quarter: string, amount: number, participantName: string) => {
    posthog.capture('winner_announced', {
      grid_id: gridId,
      quarter: quarter,
      amount: amount,
      participant_name: participantName,
    });
  },

  /**
   * Track when scores are updated
   */
  scoresUpdated: (gridId: string, quarter: string, homeScore: number, awayScore: number) => {
    posthog.capture('scores_updated', {
      grid_id: gridId,
      quarter: quarter,
      home_score: homeScore,
      away_score: awayScore,
    });
  },

  // ============================================================
  // SEASON PASS
  // ============================================================

  /**
   * Track season pass purchase
   */
  seasonPassPurchased: (userId: string, amount: number) => {
    posthog.capture('season_pass_purchased', {
      user_id: userId,
      amount: amount,
      $set: {
        has_season_pass: true,
        season_pass_purchase_date: new Date().toISOString(),
      },
    });
  },

  /**
   * Track when season pass modal is shown
   */
  seasonPassModalShown: () => {
    posthog.capture('season_pass_modal_shown');
  },

  /**
   * Track season pass cancellation
   */
  seasonPassCancelled: (userId: string) => {
    posthog.capture('season_pass_cancelled', {
      user_id: userId,
      $set: {
        has_season_pass: false,
      },
    });
  },

  // ============================================================
  // EXPORTS
  // ============================================================

  /**
   * Track when user exports grid to PDF
   */
  gridExportedPDF: (gridId: string) => {
    posthog.capture('grid_exported_pdf', {
      grid_id: gridId,
    });
  },

  /**
   * Track when user exports grid to Excel
   */
  gridExportedExcel: (gridId: string) => {
    posthog.capture('grid_exported_excel', {
      grid_id: gridId,
    });
  },

  // ============================================================
  // AUTHENTICATION
  // ============================================================

  /**
   * Track user signup
   */
  userSignedUp: (userId: string, method: 'email' | 'google' | 'github') => {
    posthog.capture('user_signed_up', {
      user_id: userId,
      signup_method: method,
      $set: {
        signup_date: new Date().toISOString(),
      },
    });
  },

  /**
   * Track user login
   */
  userLoggedIn: (userId: string) => {
    posthog.capture('user_logged_in', {
      user_id: userId,
    });
  },

  /**
   * Track user logout
   */
  userLoggedOut: (userId: string) => {
    posthog.capture('user_logged_out', {
      user_id: userId,
    });
  },

  // ============================================================
  // GAME DAY ENHANCEMENTS
  // ============================================================

  /**
   * Track when a participant is selected to view their numbers
   */
  participantSelected: (gridId: string, participantName: string, boxCount: number) => {
    posthog.capture('participant_selected', {
      grid_id: gridId,
      participant_name: participantName,
      box_count: boxCount,
    });
  },

  /**
   * Track when grid view mode is changed (landscape/portrait)
   */
  gridViewChanged: (
    gridId: string,
    viewMode: 'landscape' | 'portrait',
    deviceOrientation: 'landscape' | 'portrait',
    viewportWidth?: number,
    viewportHeight?: number
  ) => {
    posthog.capture('grid_view_changed', {
      grid_id: gridId,
      view_mode: viewMode,
      device_orientation: deviceOrientation,
      viewport_width: viewportWidth,
      viewport_height: viewportHeight,
    });
  },

  // ============================================================
  // ERRORS & ISSUES
  // ============================================================

  /**
   * Track errors for debugging
   */
  errorOccurred: (errorType: string, errorMessage: string, context?: Record<string, any>) => {
    posthog.capture('error_occurred', {
      error_type: errorType,
      error_message: errorMessage,
      ...context,
    });
  },
};

/**
 * Helper to identify user in PostHog
 */
export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  posthog.identify(userId, properties);
};

/**
 * Helper to reset user (on logout)
 */
export const resetUser = () => {
  posthog.reset();
};
