#!/bin/sh
set -e

echo "Waiting for SQL Server to be ready..."
MAX_RETRIES=30
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
    echo "ERROR: SQL Server not reachable after $MAX_RETRIES attempts."
    exit 1
  fi
  echo "SQL Server not ready yet (attempt $RETRIES/$MAX_RETRIES)... retrying in 2s"
  sleep 2
done

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Seeding database..."
npx tsx prisma/seed.ts

echo "Dev environment ready! Run 'npm run dev' to start."
