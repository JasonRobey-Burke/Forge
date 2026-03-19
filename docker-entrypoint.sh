#!/bin/sh
set -e

echo "Waiting for SQL Server to be ready..."
MAX_RETRIES=30
RETRY_INTERVAL=2
RETRIES=0

until node -e "
const net = require('net');
const s = new net.Socket();
s.connect(1433, 'db', () => { s.destroy(); process.exit(0); });
s.on('error', () => { s.destroy(); process.exit(1); });
setTimeout(() => { s.destroy(); process.exit(1); }, 2000);
" 2>/dev/null; do
  RETRIES=$((RETRIES + 1))
  if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
    echo "ERROR: SQL Server not reachable after $MAX_RETRIES attempts. Exiting."
    exit 1
  fi
  echo "SQL Server not ready yet (attempt $RETRIES/$MAX_RETRIES)... retrying in ${RETRY_INTERVAL}s"
  sleep $RETRY_INTERVAL
done

# In development, ensure node_modules has Linux-native binaries
# and stays in sync with package-lock.json
if [ "$NODE_ENV" = "development" ]; then
  LOCK_HASH=$(md5sum /app/package-lock.json | cut -d' ' -f1)
  STORED_HASH=""
  if [ -f /app/node_modules/.package-lock-hash ]; then
    STORED_HASH=$(cat /app/node_modules/.package-lock-hash)
  fi

  if [ "$LOCK_HASH" != "$STORED_HASH" ]; then
    echo "package-lock.json changed — reinstalling packages..."
    npm ci
    npx prisma generate
    echo "$LOCK_HASH" > /app/node_modules/.package-lock-hash
  else
    echo "Packages up to date."
  fi
fi

echo "SQL Server is reachable. Running Prisma migrations..."
MIGRATE_OUTPUT=$(npx prisma migrate deploy 2>&1)
echo "$MIGRATE_OUTPUT"

# In development, always run seed (upserts are idempotent)
if [ "$NODE_ENV" = "development" ]; then
  echo "Running seed..."
  npx tsx prisma/seed.ts
fi

echo "Starting application..."
exec "$@"
