#!/usr/bin/env bash
set -euo pipefail

# Starts backend (FastAPI/uvicorn) and frontend (Vite) together for local dev
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Starting backend on http://localhost:8000 ..."
(
  cd "$ROOT_DIR/backend"
  if [[ -f venv/bin/activate ]]; then source venv/bin/activate; fi
  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
) &
BACK_PID=$!

sleep 2

echo "Starting frontend on http://localhost:3000 ..."
(
  cd "$ROOT_DIR/frontend"
  npm run dev
) &
FRONT_PID=$!

echo "Backend PID: $BACK_PID, Frontend PID: $FRONT_PID"
echo "Open http://localhost:3000"

wait
