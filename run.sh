#!/bin/bash
# run.sh - Starts the Bhoomisetu project

# Default Next.js port
PORT=3000

# Project directory
PROJECT_DIR="$(pwd)"

echo "🔍 Checking for any existing process running on port $PORT..."

# Kill ALL processes using the port (handles multiple PIDs)
PIDS=$(lsof -t -i:$PORT 2>/dev/null)

if [ -n "$PIDS" ]; then
    echo "⚠️  Found process(es) on port $PORT: $PIDS"
    echo "$PIDS" | xargs kill -9 2>/dev/null
    echo "✅ Terminated all processes on port $PORT."
else
    echo "✅ No process found on port $PORT."
fi

# Also clean up any stale Next.js dev server lock/pid files
if [ -f "$PROJECT_DIR/.next/dev/pid" ]; then
    STALE_PID=$(cat "$PROJECT_DIR/.next/dev/pid" 2>/dev/null)
    if [ -n "$STALE_PID" ]; then
        echo "🧹 Cleaning up stale Next.js dev server (PID: $STALE_PID)..."
        kill -9 "$STALE_PID" 2>/dev/null
    fi
    rm -f "$PROJECT_DIR/.next/dev/pid"
fi

# Wait until the port is actually free
echo "⏳ Waiting for port $PORT to be released..."
for i in $(seq 1 10); do
    if ! lsof -i:$PORT >/dev/null 2>&1; then
        echo "✅ Port $PORT is free."
        break
    fi
    if [ "$i" -eq 10 ]; then
        echo "❌ Port $PORT is still in use after 5 seconds. Force killing again..."
        lsof -t -i:$PORT 2>/dev/null | xargs -r kill -9 2>/dev/null
        sleep 1
    fi
    sleep 0.5
done

echo "🚀 Starting Bhoomisetu development server..."
cd "$PROJECT_DIR"

# Start the dev server
pnpm run dev
