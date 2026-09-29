#!/bin/sh
# Bhoomisetu — Production Container Entrypoint
# Runs PostgreSQL migrations before starting the Next.js server.
# NOTE: `pnpm db:seed-pg` is intentionally NOT called here.
#       Seed data for examination/demo must be loaded explicitly by running:
#         docker exec <container> pnpm db:seed-pg
#       or by a one-off ECS task / AWS CodeBuild step.

set -e

echo "🚀 Bhoomisetu container starting..."
echo "📦 NODE_ENV=${NODE_ENV}"

# Validate required environment variables
MISSING=""
for var in DATABASE_URL JWT_SECRET REFRESH_SECRET ENCRYPTION_KEY; do
  eval val="\$$var"
  if [ -z "$val" ]; then
    MISSING="$MISSING $var"
  fi
done

if [ -n "$MISSING" ]; then
  echo "❌ ERROR: Missing required environment variables:$MISSING"
  echo "   Set these in your ECS Task Definition or via AWS Secrets Manager."
  exit 1
fi

# Run PostgreSQL migrations (idempotent - safe to run on every start)
echo "🔧 Running database migrations..."
node -e "
const { runPgMigration } = require('./lib/db/migrate-pg.js');
runPgMigration()
  .then(() => { console.log('✅ Migrations complete'); process.exit(0); })
  .catch(err => { console.error('❌ Migration failed:', err); process.exit(1); });
" 2>/dev/null || \
  npx tsx lib/db/migrate-pg.ts

echo "✅ Migrations applied. Starting server on port ${PORT:-3000}..."
exec node server.js
