/**
 * Admin Script: Make User Premium
 *
 * This script activates a season pass for a specific user.
 * Run with: npx tsx scripts/make-user-premium.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from .env.local
try {
  const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
} catch (error) {
  console.error('Error loading .env.local:', error);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const USER_EMAIL = 'd.rodriguez.1865@gmail.com';

async function makeUserPremium() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Find user by email
  const { data: users, error: userError } = await supabase
    .auth.admin.listUsers();

  if (userError) {
    console.error('Error fetching users:', userError);
    return;
  }

  const user = users.users.find(u => u.email === USER_EMAIL);

  if (!user) {
    console.error(`User not found: ${USER_EMAIL}`);
    return;
  }

  console.log(`Found user: ${user.email} (ID: ${user.id})`);

  // Activate season pass
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 6); // 6 months from now

  const { error: subError } = await supabase
    .from('user_subscriptions')
    .upsert({
      user_id: user.id,
      season_pass_active: true,
      season_pass_expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (subError) {
    console.error('Error updating subscription:', subError);
    return;
  }

  console.log('✅ Season pass activated!');
  console.log(`Expires at: ${expiresAt.toISOString()}`);

  // Upgrade all existing grids to premium
  const { data: grids, error: gridsError } = await supabase
    .from('grids')
    .select('id, title')
    .eq('created_by', user.id)
    .eq('is_premium', false);

  if (gridsError) {
    console.error('Error fetching grids:', gridsError);
    return;
  }

  if (grids && grids.length > 0) {
    console.log(`\nUpgrading ${grids.length} grids to premium...`);

    for (const grid of grids) {
      const { error: updateError } = await supabase
        .from('grids')
        .update({
          is_premium: true,
          premium_unlocked_at: new Date().toISOString(),
        })
        .eq('id', grid.id);

      if (updateError) {
        console.error(`Error upgrading grid ${grid.id}:`, updateError);
      } else {
        console.log(`  ✅ ${grid.title || grid.id}`);
      }
    }
  } else {
    console.log('\nNo grids to upgrade.');
  }

  console.log('\n🎉 Done! User is now premium with season pass.');
}

makeUserPremium().catch(console.error);
