#!/bin/sh
set -e

# Must be set here: container platforms replace HOSTNAME with the machine name.
export HOSTNAME=0.0.0.0
export PORT="${PORT:-3000}"

if [ -z "$AUTH_SECRET" ] || [ -z "$DATABASE_URL" ]; then
  echo "AUTH_SECRET and DATABASE_URL must be set." >&2
  exit 1
fi

/opt/prisma/node_modules/.bin/prisma migrate deploy --schema=/app/prisma/schema.prisma

# First launch: create the admin account and starter content (categories, areas,
# FAQs, pages). Safe to repeat: it never changes an existing admin's password.
# Remove SEED_ADMIN_PASSWORD from the app settings once you can sign in.
if [ -n "$SEED_ADMIN_EMAIL" ] && [ -n "$SEED_ADMIN_PASSWORD" ]; then
  node /app/launch-seed.cjs --launch || echo "Launch setup failed. See the message above." >&2
fi

exec node --max-old-space-size="${NODE_HEAP_MB:-320}" server.js
