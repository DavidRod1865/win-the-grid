import { z } from 'zod';

/**
 * Environment variable validation schema
 * Validates all required environment variables at build/startup time
 * Prevents production crashes due to missing configuration
 */
const envSchema = z.object({
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL')
    .startsWith('https://', 'Supabase URL must use HTTPS'),

  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY is required')
    .startsWith('eyJ', 'Invalid Supabase anon key format'),

  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required')
    .startsWith('eyJ', 'Invalid Supabase service role key format'),

  // Stripe Configuration
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required')
    .startsWith('pk_', 'Invalid Stripe publishable key format'),

  STRIPE_SECRET_KEY: z
    .string()
    .min(1, 'STRIPE_SECRET_KEY is required')
    .startsWith('sk_', 'Invalid Stripe secret key format'),

  STRIPE_WEBHOOK_SECRET: z
    .string()
    .min(1, 'STRIPE_WEBHOOK_SECRET is required')
    .startsWith('whsec_', 'Invalid Stripe webhook secret format'),

  STRIPE_PER_GRID_PRICE_ID: z
    .string()
    .min(1, 'STRIPE_PER_GRID_PRICE_ID is required')
    .startsWith('price_', 'Invalid Stripe price ID format'),

  STRIPE_SEASON_PASS_PRICE_ID: z
    .string()
    .min(1, 'STRIPE_SEASON_PASS_PRICE_ID is required')
    .startsWith('price_', 'Invalid Stripe price ID format'),

  // PostHog Analytics
  NEXT_PUBLIC_POSTHOG_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_POSTHOG_KEY is required')
    .startsWith('phc_', 'Invalid PostHog key format'),

  NEXT_PUBLIC_POSTHOG_HOST: z
    .string()
    .url('NEXT_PUBLIC_POSTHOG_HOST must be a valid URL')
    .default('https://app.posthog.com'),

  // Pricing Configuration
  NEXT_PUBLIC_PER_GRID_PRICE: z
    .string()
    .regex(/^\d+(\.\d{2})?$/, 'PER_GRID_PRICE must be a valid price (e.g., 4.99)')
    .default('4.99'),

  NEXT_PUBLIC_SEASON_PASS_PRICE: z
    .string()
    .regex(/^\d+(\.\d{2})?$/, 'SEASON_PASS_PRICE must be a valid price (e.g., 24.99)')
    .default('24.99'),

  // Application Configuration
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url('NEXT_PUBLIC_APP_URL must be a valid URL')
    .refine(
      (url) => {
        // In production, require HTTPS
        if (process.env.NODE_ENV === 'production') {
          return url.startsWith('https://');
        }
        return true;
      },
      { message: 'NEXT_PUBLIC_APP_URL must use HTTPS in production' }
    ),

  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

/**
 * Validate and parse environment variables
 * Call this at app startup to fail fast on configuration errors
 *
 * In development: warns about missing variables but continues
 * In production: exits immediately if any variables are missing
 */
function validateEnv() {
  const isProduction = process.env.NODE_ENV === 'production';

  // Skip validation if explicitly disabled (useful for development)
  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    console.warn('⚠️  Environment validation skipped (SKIP_ENV_VALIDATION=true)');
    return process.env as any;
  }

  try {
    // Attempt to parse and validate all environment variables
    const parsed = envSchema.parse(process.env);
    console.log('✅ Environment validation passed');
    return parsed;
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const zodError = error;

      console.error('');
      console.error('❌ Environment validation failed:');
      console.error('');

      // Safely iterate over errors
      if (Array.isArray(zodError.issues) && zodError.issues.length > 0) {
        zodError.issues.forEach((err) => {
          try {
            const path = Array.isArray(err.path) ? err.path.join('.') : String(err.path || 'unknown');
            console.error(`  ${path}: ${err.message || 'Unknown error'}`);
          } catch (e) {
            console.error(`  Unknown path: ${err.message || 'Unknown error'}`);
          }
        });
      } else {
        console.error('  Unknown validation error');
      }

      console.error('');
      console.error('Please check your .env file and ensure all required variables are set.');
      console.error('See .env.example for reference.');
      console.error('');

      // PRODUCTION: Exit immediately to prevent broken deployments
      if (isProduction) {
        console.error('🚨 PRODUCTION: Exiting due to invalid environment configuration');
        console.error('');
        process.exit(1);
        // Never reached, but TypeScript doesn't know that
        return process.env as any;
      }

      // DEVELOPMENT: Warn but continue (non-blocking)
      console.warn('⚠️  DEVELOPMENT MODE: Continuing with partial environment variables.');
      console.warn('⚠️  Some features may not work correctly.');
      console.warn('⚠️  To suppress this warning, set SKIP_ENV_VALIDATION=true in .env');
      console.warn('');

      // Return process.env as fallback - allows development to continue
      return process.env as any;
    }

    // Unknown error - log and re-throw only in production
    console.error('Unexpected error during environment validation:', error);

    if (isProduction) {
      throw error;
    } else {
      console.warn('⚠️  Continuing despite validation error in development mode');
      return process.env as any;
    }
  }
}

/**
 * Validated environment variables
 * Safe to use throughout the application
 * In development with missing variables, falls back to process.env
 */
export const env = validateEnv();

/**
 * Type-safe environment variables
 */
export type Env = z.infer<typeof envSchema>;
