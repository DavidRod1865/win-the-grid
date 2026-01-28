import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

/**
 * Server-side Stripe instance
 * Use this for all server-side Stripe operations
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});

/**
 * Pricing configuration
 */
export const PRICING = {
  PER_GRID: {
    amount: parseFloat(process.env.NEXT_PUBLIC_PER_GRID_PRICE || '4.99'),
    priceId: process.env.STRIPE_PER_GRID_PRICE_ID,
    currency: 'usd',
  },
  SEASON_PASS: {
    amount: parseFloat(process.env.NEXT_PUBLIC_SEASON_PASS_PRICE || '24.99'),
    priceId: process.env.STRIPE_SEASON_PASS_PRICE_ID,
    currency: 'usd',
  },
} as const;
