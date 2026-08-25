#!/bin/sh
# Applies pending migrations, then starts the server.
# SEED_DEMO=1 loads the demo venue. seed.ts is a no-op if it already exists.
set -e

# Next's standalone server binds to $HOSTNAME. Container runtimes set that to the
# container ID, which resolves nowhere, so the server exits with ENOTFOUND and the
# platform serves 502. Forced here rather than left to the image's ENV, because a
# host injecting its own HOSTNAME would override that.
export HOSTNAME=0.0.0.0

npx prisma migrate deploy

if [ "${SEED_DEMO:-}" = "1" ]; then
  npx tsx scripts/seed.ts
fi

exec node server.js
