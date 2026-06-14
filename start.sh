#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# バックエンド起動
echo "Starting backend..."
cd "$ROOT/backend"
uv run uvicorn main:app --reload &
BACKEND_PID=$!

# フロントエンド起動
echo "Starting frontend..."
cd "$ROOT/frontend"
npm install --silent
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Moodo is running!"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop."

# Ctrl+C で両プロセスを終了
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
