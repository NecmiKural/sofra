#!/bin/sh
# Applies pending migrations, then starts the server.
# SEED_DEMO=1 loads the demo venue — seed.ts is a no-op if it already exists.
set -e

npx prisma migrate deploy

if [ "${SEED_DEMO:-}" = "1" ]; then
  npx tsx scripts/seed.ts
fi

exec node server.js
