#!/bin/bash
# Production Readiness Verification Script
# Run this before deploying to production

set -e

echo "🔍 Win The Grid - Production Readiness Verification"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
ERRORS=0
WARNINGS=0

# Function to check file exists
check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $2"
  else
    echo -e "${RED}✗${NC} $2"
    ERRORS=$((ERRORS + 1))
  fi
}

# Function to check environment variable
check_env() {
  if grep -q "^$1=" .env 2>/dev/null; then
    VALUE=$(grep "^$1=" .env | cut -d '=' -f 2-)
    if [[ "$VALUE" == *"YOUR_"* ]] || [[ "$VALUE" == *"xxxxx"* ]] || [ -z "$VALUE" ]; then
      echo -e "${RED}✗${NC} $1 is not set or contains placeholder"
      ERRORS=$((ERRORS + 1))
    else
      echo -e "${GREEN}✓${NC} $1 is configured"
    fi
  else
    echo -e "${RED}✗${NC} $1 is missing from .env"
    ERRORS=$((ERRORS + 1))
  fi
}

# Function to check security implementation
check_security() {
  if grep -q "$2" "$1" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} $3"
  else
    echo -e "${RED}✗${NC} $3"
    ERRORS=$((ERRORS + 1))
  fi
}

echo "📁 Checking Critical Files..."
echo "-----------------------------"
check_file "sql/saas-migration.sql" "Database migration script exists"
check_file "DEPLOYMENT.md" "Deployment documentation exists"
check_file "SECURITY_FIXES.md" "Security fixes documentation exists"
check_file "src/middleware.ts" "Security headers middleware exists"
check_file "src/lib/env.ts" "Environment validation exists"
check_file "src/app/error.tsx" "Global error boundary exists"
echo ""

echo "🔐 Checking Security Implementations..."
echo "---------------------------------------"
check_security "sql/saas-migration.sql" "ALTER TABLE grids ENABLE ROW LEVEL SECURITY" "RLS enabled on grids table"
check_security "sql/saas-migration.sql" "CREATE TABLE.*webhook_events" "Webhook idempotency table exists"
check_security "src/app/api/webhooks/stripe/route.ts" "webhook_events" "Webhook idempotency check implemented"
check_security "src/app/api/create-checkout/route.ts" "NEXT_PUBLIC_APP_URL" "Open redirect fix implemented"
check_security "src/contexts/AuthContext.tsx" "StorageFactory.resetInstance" "Storage factory reset implemented"
check_security "src/middleware.ts" "X-Frame-Options" "Security headers configured"
check_security "src/lib/env.ts" "envSchema" "Environment validation implemented"
check_security "src/app/api/create-checkout/route.ts" "authenticatedUser" "Server-side auth validation implemented"
echo ""

echo "🔑 Checking Environment Configuration..."
echo "---------------------------------------"
if [ ! -f ".env" ]; then
  echo -e "${RED}✗${NC} .env file not found"
  echo -e "${YELLOW}⚠${NC}  Copy .env.example to .env and configure all variables"
  ERRORS=$((ERRORS + 1))
else
  check_env "NEXT_PUBLIC_SUPABASE_URL"
  check_env "SUPABASE_SERVICE_ROLE_KEY"
  check_env "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"
  check_env "STRIPE_SECRET_KEY"
  check_env "STRIPE_WEBHOOK_SECRET"
  check_env "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
  check_env "STRIPE_PER_GRID_PRICE_ID"
  check_env "STRIPE_SEASON_PASS_PRICE_ID"
  check_env "NEXT_PUBLIC_POSTHOG_KEY"
  check_env "NEXT_PUBLIC_APP_URL"
fi
echo ""

echo "🧪 Checking Code Quality..."
echo "---------------------------"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}⚠${NC}  node_modules not found. Run 'npm install' first."
  WARNINGS=$((WARNINGS + 1))
else
  # Run TypeScript check
  echo -n "TypeScript check... "
  if npx tsc --noEmit --skipLibCheck > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${RED}✗${NC}"
    ERRORS=$((ERRORS + 1))
  fi

  # Run ESLint
  echo -n "ESLint check... "
  if npm run lint > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${YELLOW}⚠${NC} (warnings found)"
    WARNINGS=$((WARNINGS + 1))
  fi
fi
echo ""

echo "📝 Checking for Exposed Secrets..."
echo "----------------------------------"
if grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\." .env.example 2>/dev/null | grep -v "YOUR_.*_HERE" | grep -v "^#"; then
  echo -e "${RED}✗${NC} Real credentials found in .env.example"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✓${NC} No real credentials in .env.example"
fi
echo ""

echo "🚀 Production Environment Checks..."
echo "-----------------------------------"
if [ -f ".env" ]; then
  if grep -q "NODE_ENV=production" .env 2>/dev/null; then
    if grep -q "NEXT_PUBLIC_APP_URL=https://" .env 2>/dev/null; then
      echo -e "${GREEN}✓${NC} Production mode configured with HTTPS"
    else
      echo -e "${RED}✗${NC} Production mode requires HTTPS for APP_URL"
      ERRORS=$((ERRORS + 1))
    fi

    if grep -q "STRIPE_SECRET_KEY=sk_live_" .env 2>/dev/null; then
      echo -e "${GREEN}✓${NC} Using Stripe live keys"
    else
      echo -e "${YELLOW}⚠${NC}  Using Stripe test keys (switch to live for production)"
      WARNINGS=$((WARNINGS + 1))
    fi
  else
    echo -e "${YELLOW}⚠${NC}  Not in production mode (NODE_ENV != production)"
  fi
fi
echo ""

echo "=================================================="
echo ""

# Summary
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ ALL CHECKS PASSED!${NC}"
  echo ""
  echo "Your application is ready for production deployment."
  echo "Next steps:"
  echo "  1. Review SECURITY_FIXES.md"
  echo "  2. Rotate exposed credentials (see DEPLOYMENT.md)"
  echo "  3. Run database migrations in Supabase"
  echo "  4. Follow DEPLOYMENT.md for deployment"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠ PASSED WITH WARNINGS${NC}"
  echo ""
  echo "Warnings found: $WARNINGS"
  echo "Review warnings above before deploying."
  exit 0
else
  echo -e "${RED}❌ CHECKS FAILED${NC}"
  echo ""
  echo "Errors: $ERRORS"
  echo "Warnings: $WARNINGS"
  echo ""
  echo "Fix errors above before deploying to production."
  exit 1
fi
