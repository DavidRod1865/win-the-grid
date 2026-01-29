#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Verifying Stripe Payment in Database...${NC}\n"

# Check recent payments
echo -e "${YELLOW}📊 Recent Payments:${NC}"
npx supabase@latest db execute --project-ref detsstsefvrxurfqfwlf --sql "
SELECT
  id,
  amount,
  status,
  payment_type,
  created_at
FROM payments
ORDER BY created_at DESC
LIMIT 3;
"

echo ""

# Check grids with share codes
echo -e "${YELLOW}🔓 Recently Unlocked Grids:${NC}"
npx supabase@latest db execute --project-ref detsstsefvrxurfqfwlf --sql "
SELECT
  id,
  is_premium,
  share_code,
  premium_unlocked_at
FROM grids
WHERE share_code IS NOT NULL
ORDER BY premium_unlocked_at DESC
LIMIT 3;
"

echo ""

# Check user subscriptions
echo -e "${YELLOW}👤 User Subscriptions:${NC}"
npx supabase@latest db execute --project-ref detsstsefvrxurfqfwlf --sql "
SELECT
  user_id,
  grids_purchased_count,
  total_spent,
  season_pass_active
FROM user_subscriptions
ORDER BY updated_at DESC
LIMIT 3;
"

echo -e "\n${GREEN}✅ Verification complete!${NC}"
