#!/usr/bin/env bash
# Run the project on macOS/Linux/Git Bash: preflight-check first, then start API + Web.
# If a check fails, it reports what's wrong and stops (starts nothing).
#   bash scripts/run.sh            # check + run
#   bash scripts/run.sh --setup    # bootstrap venv/deps/.env then run
set -uo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(dirname "$here")"
api="$root/apps/api"
web="$root/apps/web"
venv_py="$api/.venv/bin/python"

echo ""
echo "=== Preflight ==="

# 1. Terminal tools
if ! bash "$here/check-tools.sh"; then
  echo "STOP: required terminal tools are missing (report above)."
  exit 1
fi

setup=0
[ "${1:-}" = "--setup" ] && setup=1

# 2. Optional bootstrap
if [ "$setup" = "1" ]; then
  echo ""
  echo "=== Setup (bootstrap) ==="
  [ -x "$venv_py" ] || bash "$api/scripts/setup.sh"
  [ -d "$web/node_modules" ] || ( cd "$web" && npm install --no-audit --no-fund )
fi

# 3. Project checks
problems=()

if [ ! -x "$venv_py" ]; then
  problems+=("Backend venv missing. Fix: cd apps/api && bash scripts/setup.sh   (or run with --setup)")
elif ! "$venv_py" -c "import fastapi, uvicorn, langgraph" 2>/dev/null; then
  problems+=("Backend deps not installed. Fix: cd apps/api && ./.venv/bin/python -m pip install -r requirements.txt   (or --setup)")
fi

if [ ! -f "$api/.env" ]; then
  problems+=("apps/api/.env missing. Fix: cd apps/api && cp .env.example .env   then set OPENAI_API_KEY")
elif grep -q "OPENAI_API_KEY=sk-your-key-here" "$api/.env" || ! grep -qE "OPENAI_API_KEY=.+" "$api/.env"; then
  problems+=("OPENAI_API_KEY not set in apps/api/.env (placeholder/empty). Edit it with your real key.")
fi

[ -d "$web/node_modules" ] || problems+=("Frontend deps missing. Fix: cd apps/web && npm install   (or run with --setup)")

if [ "${#problems[@]}" -gt 0 ]; then
  echo ""
  echo "NOT READY — fix these first:"
  for p in "${problems[@]}"; do echo "  - $p"; done
  echo ""
  echo "Tip: scripts/run.sh --setup bootstraps venv, deps, and .env."
  exit 1
fi

echo ""
echo "All checks passed. Starting..."
echo "  API -> http://localhost:8000/docs"
echo "  Web -> http://localhost:3000"
echo ""

# Start API in the background; web in the foreground. Ctrl-C stops both.
"$venv_py" -m uvicorn src.main:app --reload --host 127.0.0.1 --port 8000 --app-dir "$api" &
api_pid=$!
trap 'kill "$api_pid" 2>/dev/null' EXIT INT TERM

cd "$web" && npm run dev
