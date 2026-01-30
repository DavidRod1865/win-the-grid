import { PayoutRule } from '@/types';

export interface SidePool {
  name: string;
  percentage: number;
  enabled: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  totalPercentage: number;
  mainPayoutPercentage: number;
  sidePoolPercentage: number;
  errors: string[];
}

/**
 * Validates that payout percentages (main payouts + side pools) sum to exactly 100%
 *
 * @param payoutRules - Main payout rules for quarters (Q1, Half, Q3, Final)
 * @param sidePools - Side pool configurations (Reverse Half, Reverse Final, etc.)
 * @returns Validation result with breakdown and any errors
 */
export function validatePayoutPercentages(
  payoutRules: PayoutRule[],
  sidePools: SidePool[]
): ValidationResult {
  const mainPayoutPercentage = payoutRules.reduce((sum, rule) => sum + rule.percentage, 0);
  const sidePoolPercentage = sidePools
    .filter(p => p.enabled && p.percentage > 0)
    .reduce((sum, pool) => sum + pool.percentage, 0);
  const totalPercentage = mainPayoutPercentage + sidePoolPercentage;

  const errors: string[] = [];

  // Allow ±0.01% tolerance for rounding
  if (Math.abs(totalPercentage - 100) > 0.01) {
    errors.push(`Total must equal 100% (currently ${totalPercentage.toFixed(2)}%)`);
  }

  return {
    isValid: errors.length === 0,
    totalPercentage,
    mainPayoutPercentage,
    sidePoolPercentage,
    errors
  };
}

/**
 * Converts a dollar amount to percentage of total pot
 * Guards against division by zero
 */
export function dollarToPercentage(dollarAmount: number, totalPot: number): number {
  if (totalPot <= 0) return 0;
  return (dollarAmount / totalPot) * 100;
}

/**
 * Converts a percentage to dollar amount
 * Rounds to 2 decimal places
 */
export function percentageToDollar(percentage: number, totalPot: number): number {
  return Math.round((totalPot * percentage / 100) * 100) / 100;
}
